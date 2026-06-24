import { adminDb } from "@/lib/firebase/admin";
import { getServerFirebaseUser, ensureUserProfile } from "@/lib/firebase/session";
import { getServerActiveOrganization } from "@/lib/org-server";
import { permissionForRole } from "@/lib/workspace";
import type {
  ActivityLogWithActor,
  AnnouncementRecord,
  AnnouncementRow,
  EventRow,
  HandoverRow,
  MemberRecord,
  MeetingAgendaItemRow,
  MeetingAttendeeRow,
  MeetingNoteRow,
  MeetingRow,
  MeetingWithDetails,
  MembershipRole,
  MembershipRow,
  OrganizationRoleRecord,
  OrganizationRow,
  OrganizationWithMembership,
  PermissionLevel,
  ResourceRecord,
  TeamRecord,
  TeamRow,
  TaskRecord,
  TaskWithAssignee,
  UserRow
} from "@/types";

type AnyRow = Record<string, any>;

function row<T>(id: string, data: FirebaseFirestore.DocumentData): T {
  return { id, ...data } as T;
}

async function getDocById<T>(collection: string, id: string): Promise<T | null> {
  const snap = await adminDb.collection(collection).doc(id).get();
  return snap.exists ? row<T>(snap.id, snap.data() ?? {}) : null;
}

async function getRows<T>(collection: string, filters: Array<[string, FirebaseFirestore.WhereFilterOp, any]> = []): Promise<T[]> {
  let ref: FirebaseFirestore.Query = adminDb.collection(collection);

  filters.forEach(([field, op, value]) => {
    ref = ref.where(field, op, value);
  });

  const snap = await ref.get();
  return snap.docs.map((doc) => row<T>(doc.id, doc.data()));
}

function sortByDate<T extends AnyRow>(rows: T[], field: string, direction: "asc" | "desc" = "desc") {
  return [...rows].sort((left, right) => {
    const diff = String(left[field] ?? "").localeCompare(String(right[field] ?? ""));
    return direction === "asc" ? diff : -diff;
  });
}

async function getUserById(userId: string | null | undefined) {
  if (!userId) return null;
  return getDocById<UserRow>("users", userId);
}

async function requireOrganizationMember(orgId: string): Promise<MembershipRow> {
  const authUser = await getServerFirebaseUser();

  if (!authUser) {
    throw new Error("Unauthenticated.");
  }

  const membership = await getDocById<MembershipRow>("memberships", `${orgId}_${authUser.uid}`);

  if (!membership) {
    throw new Error("Unauthorized organization access.");
  }

  return membership;
}

async function hydrateTask(task: TaskRecord): Promise<TaskRecord> {
  return { ...task, assignee: await getUserById(task.assigned_to) };
}

async function hydrateActivity(activity: ActivityLogWithActor): Promise<ActivityLogWithActor> {
  return { ...activity, actor: await getUserById(activity.actor_user_id) };
}

export async function getAuthSession() {
  return getServerFirebaseUser();
}

export async function getCurrentUser(): Promise<UserRow | null> {
  const authUser = await getServerFirebaseUser();
  if (!authUser) return null;

  return ensureUserProfile(authUser.uid, {
    email: authUser.email ?? null,
    full_name: authUser.name ?? null,
    avatar_url: authUser.picture ?? null
  });
}

export async function getUserWithMemberships(): Promise<{
  user: UserRow | null;
  memberships: OrganizationWithMembership[];
}> {
  const user = await getCurrentUser();
  if (!user) return { user: null, memberships: [] };

  return { user, memberships: await getUserMembershipsForUser(user.id) };
}

async function getUserMembershipsForUser(userId: string): Promise<OrganizationWithMembership[]> {
  const memberships = await getRows<MembershipRow>("memberships", [["user_id", "==", userId]]);
  const organizations = await Promise.all(
    memberships.map(async (membership) => {
      const organization = await getDocById<OrganizationRow>("organizations", membership.organization_id);
      if (!organization) return null;

      return {
        ...organization,
        membership: {
          role: membership.role as MembershipRole,
          permission_level: permissionForRole(membership.role as MembershipRole) === "admin"
            ? "admin"
            : (membership.permission_level as PermissionLevel)
        }
      };
    })
  );

  return organizations.filter(Boolean) as OrganizationWithMembership[];
}

export async function getUserMemberships(): Promise<OrganizationWithMembership[]> {
  const user = await getCurrentUser();
  return user ? getUserMembershipsForUser(user.id) : [];
}

export async function getCurrentOrganization() {
  const memberships = await getUserMemberships();
  return getServerActiveOrganization(memberships);
}

export async function getOrganization(orgId: string): Promise<OrganizationRow | null> {
  await requireOrganizationMember(orgId);
  return getDocById<OrganizationRow>("organizations", orgId);
}

export async function getOrganizationRoles(orgId: string): Promise<OrganizationRoleRecord[]> {
  await requireOrganizationMember(orgId);
  const roles = await getRows<OrganizationRoleRecord>("organization_roles", [["organization_id", "==", orgId]]);
  return sortByDate(roles, "created_at", "asc");
}

export async function getOrgMembers(orgId: string): Promise<MemberRecord[]> {
  await requireOrganizationMember(orgId);
  const memberships = await getRows<MembershipRow>("memberships", [["organization_id", "==", orgId]]);
  const hydrated = await Promise.all(
    sortByDate(memberships, "joined_at", "asc").map(async (membership) => ({
      ...membership,
      user: await getUserById(membership.user_id)
    }))
  );

  return hydrated;
}

export async function getOrganizationTeams(orgId: string): Promise<TeamRecord[]> {
  await requireOrganizationMember(orgId);
  const teams = await getRows<TeamRow>("teams", [["organization_id", "==", orgId]]);
  const hydrated = await Promise.all(
    sortByDate(teams, "created_at", "asc").map(async (team) => ({
      ...team,
      lead: await getUserById(team.lead_user_id)
    }))
  );

  return hydrated;
}

export async function getOrganizationResources(orgId: string): Promise<ResourceRecord[]> {
  await requireOrganizationMember(orgId);
  const resources = await getRows<ResourceRecord>("resources", [["organization_id", "==", orgId]]);
  const hydrated = await Promise.all(
    sortByDate(resources, "created_at").map(async (resource) => ({
      ...resource,
      uploader: await getUserById(resource.uploaded_by)
    }))
  );

  return hydrated;
}

export async function getOrganizationAnnouncements(orgId: string): Promise<AnnouncementRecord[]> {
  await requireOrganizationMember(orgId);
  const announcements = await getRows<AnnouncementRecord>("announcements", [["organization_id", "==", orgId]]);
  const sorted = [...announcements].sort((left, right) => {
    if (Boolean(left.pinned) !== Boolean(right.pinned)) return left.pinned ? -1 : 1;
    return String(right.created_at ?? "").localeCompare(String(left.created_at ?? ""));
  });

  return Promise.all(sorted.map(async (announcement) => ({ ...announcement, author: await getUserById(announcement.created_by) })));
}

export async function getOrganizationEvents(orgId: string): Promise<EventRow[]> {
  await requireOrganizationMember(orgId);
  const events = await getRows<EventRow>("events", [["organization_id", "==", orgId]]);
  return sortByDate(events, "start_time", "asc");
}

export async function getDashboardTasks(orgId: string, userId: string): Promise<TaskWithAssignee[]> {
  const membership = await requireOrganizationMember(orgId);
  const authUser = await getServerFirebaseUser();

  if (membership.permission_level === "member" && authUser?.uid !== userId) {
    throw new Error("Unauthorized task access.");
  }

  const tasks = await getRows<TaskRecord>("tasks", [["organization_id", "==", orgId]]);
  const filtered = tasks
    .filter((task) => task.assigned_to === userId && task.status !== "done")
    .sort((left, right) => String(left.due_date ?? "9999").localeCompare(String(right.due_date ?? "9999")))
    .slice(0, 5);

  return Promise.all(filtered.map(hydrateTask)) as Promise<TaskWithAssignee[]>;
}

export async function getUpcomingMeetings(orgId: string): Promise<MeetingRow[]> {
  await requireOrganizationMember(orgId);
  const now = new Date();
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);

  const meetings = await getRows<MeetingRow>("meetings", [["organization_id", "==", orgId]]);
  return sortByDate(
    meetings.filter((meeting) => {
      const start = meeting.start_time ? new Date(meeting.start_time) : null;
      return start && start >= now && start <= nextWeek;
    }),
    "start_time",
    "asc"
  ).slice(0, 3);
}

export async function getRecentActivity(orgId: string): Promise<ActivityLogWithActor[]> {
  await requireOrganizationMember(orgId);
  const activity = await getRows<ActivityLogWithActor>("activity_logs", [["organization_id", "==", orgId]]);
  return Promise.all(sortByDate(activity, "created_at").slice(0, 10).map(hydrateActivity));
}

export async function getDashboardAnnouncements(orgId: string): Promise<AnnouncementRow[]> {
  await requireOrganizationMember(orgId);
  const announcements = await getRows<AnnouncementRow>("announcements", [["organization_id", "==", orgId]]);
  return announcements
    .sort((left, right) => {
      if (Boolean(left.pinned) !== Boolean(right.pinned)) return left.pinned ? -1 : 1;
      return String(right.created_at ?? "").localeCompare(String(left.created_at ?? ""));
    })
    .slice(0, 3);
}

export async function getHealthCounts(orgId: string) {
  await requireOrganizationMember(orgId);
  const nowDate = new Date().toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [tasks, handovers, members, meetings] = await Promise.all([
    getRows<TaskRecord>("tasks", [["organization_id", "==", orgId]]),
    getRows<HandoverRow>("handovers", [["organization_id", "==", orgId]]),
    getRows<MembershipRow>("memberships", [["organization_id", "==", orgId]]),
    getRows<MeetingRow>("meetings", [["organization_id", "==", orgId]])
  ]);

  return {
    overdueTasks: tasks.filter((task) => task.status !== "done" && task.due_date && task.due_date < nowDate).length,
    missingHandovers: handovers.filter((handover) => (handover.completion_percent ?? 0) < 100).length,
    members: members.length,
    meetingsThisMonth: meetings.filter((meeting) => meeting.start_time && meeting.start_time >= monthStart.toISOString()).length
  };
}

export async function getOrganizationHandovers(orgId: string): Promise<HandoverRow[]> {
  await requireOrganizationMember(orgId);
  const handovers = await getRows<HandoverRow>("handovers", [["organization_id", "==", orgId]]);
  return sortByDate(handovers, "updated_at");
}

export async function getOrganizationTasks(orgId: string): Promise<TaskRecord[]> {
  const membership = await requireOrganizationMember(orgId);
  const authUser = await getServerFirebaseUser();
  const permission = permissionForRole(membership.role);
  const tasks = await getRows<TaskRecord>("tasks", [["organization_id", "==", orgId]]);
  const visibleTasks = tasks.filter((task) => {
    if (task.visibility === "private") {
      return task.created_by === authUser?.uid;
    }

    if (permission === "member" && membership.permission_level === "member") {
      return task.assigned_to === authUser?.uid || task.created_by === authUser?.uid;
    }

    return true;
  });

  return Promise.all(sortByDate(visibleTasks, "created_at").map(hydrateTask));
}

export async function getTaskActivity(orgId: string, taskId: string): Promise<ActivityLogWithActor[]> {
  await requireOrganizationMember(orgId);
  const activity = await getRows<ActivityLogWithActor>("activity_logs", [["organization_id", "==", orgId]]);
  const filtered = activity.filter((item) => (item.metadata as Record<string, unknown> | null)?.task_id === taskId);
  return Promise.all(sortByDate(filtered, "created_at").map(hydrateActivity));
}

export async function getMeetingsByTime(orgId: string) {
  await requireOrganizationMember(orgId);
  const now = new Date().toISOString();
  const meetings = await getRows<MeetingRow>("meetings", [["organization_id", "==", orgId]]);

  return {
    upcoming: sortByDate(meetings.filter((meeting) => (meeting.start_time ?? "") >= now), "start_time", "asc"),
    past: sortByDate(meetings.filter((meeting) => (meeting.start_time ?? "") < now), "start_time")
  };
}

export async function getMeetingDetails(meetingId: string): Promise<MeetingWithDetails | null> {
  const meeting = await getDocById<MeetingRow>("meetings", meetingId);
  if (!meeting) return null;
  await requireOrganizationMember(meeting.organization_id);

  const [notes, attendees, agendaItems] = await Promise.all([
    getRows<MeetingNoteRow>("meeting_notes", [["meeting_id", "==", meetingId]]),
    getRows<MeetingAttendeeRow>("meeting_attendees", [["meeting_id", "==", meetingId]]),
    getRows<MeetingAgendaItemRow>("meeting_agenda_items", [["meeting_id", "==", meetingId]])
  ]);

  const hydratedAttendees = await Promise.all(
    sortByDate(attendees, "created_at", "asc").map(async (attendee) => ({
      ...attendee,
      user: await getUserById(attendee.user_id)
    }))
  );

  return {
    ...meeting,
    notes: sortByDate(notes, "created_at"),
    attendees: hydratedAttendees,
    agendaItems: [...agendaItems].sort((left, right) => left.position - right.position)
  };
}

export async function getMeetingActionItems(meetingId: string): Promise<TaskRecord[]> {
  const meeting = await getDocById<MeetingRow>("meetings", meetingId);
  if (!meeting) return [];
  await requireOrganizationMember(meeting.organization_id);

  const tasks = await getRows<TaskRecord>("tasks", [["source_meeting_id", "==", meetingId]]);
  return Promise.all(sortByDate(tasks, "created_at").map(hydrateTask));
}
