import { createServerSupabaseClient } from "@/lib/supabase/server";
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
  MeetingWithDetails,
  MeetingNoteRow,
  MembershipRow,
  MeetingRow,
  OrganizationRow,
  PermissionLevel,
  OrganizationWithMembership,
  ResourceRecord,
  MembershipRole,
  TaskRecord,
  TaskWithAssignee,
  UserRow
} from "@/types";

export async function getCurrentUser(): Promise<UserRow | null> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user: authUser },
    error: authError
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!authUser) {
    return null;
  }

  const { data, error } = await supabase.from("users").select("*").eq("id", authUser.id).single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getUserMemberships(): Promise<OrganizationWithMembership[]> {
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("role, permission_level, organization:organizations(*)")
    .eq("user_id", user.id)
    .returns<Array<{ role: MembershipRole; permission_level: PermissionLevel; organization: OrganizationRow }>>();

  if (error) {
    throw error;
  }

  return (data ?? []).map((membership) => ({
    ...(membership.organization as OrganizationRow),
    membership: {
      role: membership.role,
      permission_level: membership.permission_level
    }
  }));
}

export async function getCurrentOrganization() {
  const memberships = await getUserMemberships();

  return getServerActiveOrganization(memberships);
}

export async function getOrganization(orgId: string): Promise<OrganizationRow | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("organizations").select("*").eq("id", orgId).maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getOrgMembers(
  orgId: string
): Promise<MemberRecord[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("id, user_id, organization_id, role, permission_level, joined_at, user:users(*)")
    .eq("organization_id", orgId)
    .order("joined_at", { ascending: true })
    .returns<Array<MembershipRow & { user: UserRow | null }>>();

  if (error) {
    throw error;
  }

  return (data ?? []).map((membership) => ({
    id: membership.id,
    user_id: membership.user_id,
    organization_id: membership.organization_id,
    role: membership.role as MembershipRole,
    permission_level: membership.permission_level as PermissionLevel,
    joined_at: membership.joined_at,
    user: membership.user as UserRow | null
  }));
}

export async function getOrganizationResources(orgId: string): Promise<ResourceRecord[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("resources")
    .select(
      "id, organization_id, title, description, content, type, category, file_url, external_url, tags, uploaded_by, created_at, uploader:users(id, full_name, email, avatar_url)"
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .returns<ResourceRecord[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getOrganizationAnnouncements(orgId: string): Promise<AnnouncementRecord[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("id, organization_id, title, content, pinned, created_by, created_at, author:users(id, full_name, email, avatar_url)")
    .eq("organization_id", orgId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<AnnouncementRecord[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getOrganizationEvents(orgId: string): Promise<EventRow[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("organization_id", orgId)
    .order("start_time", { ascending: true })
    .returns<EventRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getDashboardTasks(orgId: string, userId: string): Promise<TaskWithAssignee[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, organization_id, title, description, assigned_to, created_by, due_date, status, priority, recurring_rule, created_at, assignee:users(id, full_name, email, avatar_url, created_at)")
    .eq("organization_id", orgId)
    .eq("assigned_to", userId)
    .in("status", ["todo", "in_progress"])
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(5)
    .returns<Array<TaskWithAssignee>>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getUpcomingMeetings(orgId: string): Promise<MeetingRow[]> {
  const supabase = createServerSupabaseClient();
  const now = new Date();
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);

  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("organization_id", orgId)
    .gte("start_time", now.toISOString())
    .lte("start_time", nextWeek.toISOString())
    .order("start_time", { ascending: true })
    .limit(3)
    .returns<MeetingRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getRecentActivity(orgId: string): Promise<ActivityLogWithActor[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("activity_logs")
    .select("id, organization_id, actor_user_id, action, metadata, created_at, actor:users(id, full_name, email, avatar_url)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(10)
    .returns<ActivityLogWithActor[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getDashboardAnnouncements(orgId: string): Promise<AnnouncementRow[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("organization_id", orgId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(3)
    .returns<AnnouncementRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getHealthCounts(orgId: string) {
  const supabase = createServerSupabaseClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const now = new Date();

  const [overdueTasks, missingHandovers, members, meetingsThisMonth] = await Promise.all([
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .not("status", "eq", "done")
      .lt("due_date", now.toISOString().slice(0, 10)),
    supabase
      .from("handovers")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("completion_percent", 0),
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase
      .from("meetings")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("start_time", monthStart.toISOString())
  ]);

  if (overdueTasks.error) {
    throw overdueTasks.error;
  }

  if (missingHandovers.error) {
    throw missingHandovers.error;
  }

  if (members.error) {
    throw members.error;
  }

  if (meetingsThisMonth.error) {
    throw meetingsThisMonth.error;
  }

  return {
    overdueTasks: overdueTasks.count ?? 0,
    missingHandovers: missingHandovers.count ?? 0,
    members: members.count ?? 0,
    meetingsThisMonth: meetingsThisMonth.count ?? 0
  };
}

export async function getOrganizationHandovers(orgId: string): Promise<HandoverRow[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("handovers")
    .select("*")
    .eq("organization_id", orgId)
    .order("updated_at", { ascending: false })
    .returns<HandoverRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getOrganizationTasks(orgId: string): Promise<TaskRecord[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, organization_id, title, description, assigned_to, created_by, source_meeting_id, due_date, status, priority, recurring_rule, created_at, assignee:users(id, full_name, email, avatar_url)"
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .returns<TaskRecord[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getTaskActivity(orgId: string, taskId: string): Promise<ActivityLogWithActor[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("activity_logs")
    .select("id, organization_id, actor_user_id, action, metadata, created_at, actor:users(id, full_name, email, avatar_url)")
    .eq("organization_id", orgId)
    .contains("metadata", { task_id: taskId })
    .order("created_at", { ascending: false })
    .returns<ActivityLogWithActor[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getMeetingsByTime(orgId: string) {
  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();

  const [upcoming, past] = await Promise.all([
    supabase
      .from("meetings")
      .select("*")
      .eq("organization_id", orgId)
      .gte("start_time", now)
      .order("start_time", { ascending: true })
      .returns<MeetingRow[]>(),
    supabase
      .from("meetings")
      .select("*")
      .eq("organization_id", orgId)
      .lt("start_time", now)
      .order("start_time", { ascending: false })
      .returns<MeetingRow[]>()
  ]);

  if (upcoming.error) {
    throw upcoming.error;
  }

  if (past.error) {
    throw past.error;
  }

  return {
    upcoming: upcoming.data ?? [],
    past: past.data ?? []
  };
}

export async function getMeetingDetails(meetingId: string): Promise<MeetingWithDetails | null> {
  const supabase = createServerSupabaseClient();
  const { data: meeting, error: meetingError } = await supabase.from("meetings").select("*").eq("id", meetingId).maybeSingle<MeetingRow>();

  if (meetingError) {
    throw meetingError;
  }

  if (!meeting) {
    return null;
  }

  const [notes, attendees, agendaItems] = await Promise.all([
    supabase
      .from("meeting_notes")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("created_at", { ascending: false })
      .returns<MeetingNoteRow[]>(),
    supabase
      .from("meeting_attendees")
      .select("id, meeting_id, user_id, created_at, user:users(*)")
      .eq("meeting_id", meetingId)
      .order("created_at", { ascending: true })
      .returns<Array<MeetingAttendeeRow & { user: UserRow | null }>>(),
    supabase
      .from("meeting_agenda_items")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("position", { ascending: true })
      .returns<MeetingAgendaItemRow[]>()
  ]);

  if (notes.error) {
    throw notes.error;
  }

  if (attendees.error) {
    throw attendees.error;
  }

  if (agendaItems.error) {
    throw agendaItems.error;
  }

  return {
    ...meeting,
    notes: notes.data ?? [],
    attendees: attendees.data ?? [],
    agendaItems: agendaItems.data ?? []
  };
}

export async function getMeetingActionItems(meetingId: string): Promise<TaskRecord[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, organization_id, title, description, assigned_to, created_by, source_meeting_id, due_date, status, priority, recurring_rule, created_at, assignee:users(id, full_name, email, avatar_url)"
    )
    .eq("source_meeting_id", meetingId)
    .order("created_at", { ascending: false })
    .returns<TaskRecord[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}
