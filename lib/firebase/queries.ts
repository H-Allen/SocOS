import { adminDb } from "@/lib/firebase/admin";
import { getServerFirebaseUser, ensureUserProfile } from "@/lib/firebase/session";
import { getServerActiveOrganization } from "@/lib/org-server";
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
          permission_level: membership.permission_level as PermissionLevel
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
  return getDocById<OrganizationRow>("organizations", orgId);
}

export async function getOrganizationRoles(orgId: string): Promise<OrganizationRoleRecord[]> {
  const roles = await getRows<OrganizationRoleRecord>("organization_roles", [["organization_id", "==", orgId]]);
  return sortByDate(roles, "created_at", "asc");
}

export async function getOrgMembers(orgId: string): Promise<MemberRecord[]> {
  const memberships = await getRows<MembershipRow>("memberships", [["organization_id", "==", orgId]]);
  const hydrated = await Promise.all(
    sortByDate(memberships, "joined_at", "asc").map(async (membership) => ({
      ...membership,
      user: await getUserById(membership.user_id)
    }))
  );

  return hydrated;
}

export async function getOrganizationResources(orgId: string): Promise<ResourceRecord[]> {
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
  const announcements = await getRows<AnnouncementRecord>("announcements", [["organization_id", "==", orgId]]);
  const sorted = [...announcements].sort((left, right) => {
    if (Boolean(left.pinned) !== Boolean(right.pinned)) return left.pinned ? -1 : 1;
    return String(right.created_at ?? "").localeCompare(String(left.created_at ?? ""));
  });

  return Promise.all(sorted.map(async (announcement) => ({ ...announcement, author: await getUserById(announcement.created_by) })));
}

export async function getOrganizationEvents(orgId: string): Promise<EventRow[]> {
  const events = await getRows<EventRow>("events", [["organization_id", "==", orgId]]);
  return sortByDate(events, "start_time", "asc");
}

export async function getDashboardTasks(orgId: string, userId: string): Promise<TaskWithAssignee[]> {
  const tasks = await getRows<TaskRecord>("tasks", [["organization_id", "==", orgId]]);
  const filtered = tasks
    .filter((task) => task.assigned_to === userId && task.status !== "done")
    .sort((left, right) => String(left.due_date ?? "9999").localeCompare(String(right.due_date ?? "9999")))
    .slice(0, 5);

  return Promise.all(filtered.map(hydrateTask)) as Promise<TaskWithAssignee[]>;
}

export async function getUpcomingMeetings(orgId: string): Promise<MeetingRow[]> {
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
  const activity = await getRows<ActivityLogWithActor>("activity_logs", [["organization_id", "==", orgId]]);
  return Promise.all(sortByDate(activity, "created_at").slice(0, 10).map(hydrateActivity));
}

export async function getDashboardAnnouncements(orgId: string): Promise<AnnouncementRow[]> {
  const announcements = await getRows<AnnouncementRow>("announcements", [["organization_id", "==", orgId]]);
  return announcements
    .sort((left, right) => {
      if (Boolean(left.pinned) !== Boolean(right.pinned)) return left.pinned ? -1 : 1;
      return String(right.created_at ?? "").localeCompare(String(left.created_at ?? ""));
    })
    .slice(0, 3);
}

export async function getHealthCounts(orgId: string) {
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
  const handovers = await getRows<HandoverRow>("handovers", [["organization_id", "==", orgId]]);
  return sortByDate(handovers, "updated_at");
}

export async function getOrganizationTasks(orgId: string): Promise<TaskRecord[]> {
  const tasks = await getRows<TaskRecord>("tasks", [["organization_id", "==", orgId]]);
  return Promise.all(sortByDate(tasks, "created_at").map(hydrateTask));
}

export async function getTaskActivity(orgId: string, taskId: string): Promise<ActivityLogWithActor[]> {
  const activity = await getRows<ActivityLogWithActor>("activity_logs", [["organization_id", "==", orgId]]);
  const filtered = activity.filter((item) => (item.metadata as Record<string, unknown> | null)?.task_id === taskId);
  return Promise.all(sortByDate(filtered, "created_at").map(hydrateActivity));
}

export async function getMeetingsByTime(orgId: string) {
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
  const tasks = await getRows<TaskRecord>("tasks", [["source_meeting_id", "==", meetingId]]);
  return Promise.all(sortByDate(tasks, "created_at").map(hydrateTask));
}
