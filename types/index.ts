export * from "@/types/database";

import type {
  MeetingNoteRow,
  MeetingAttendeeRow,
  MeetingAgendaItemRow,
  MeetingRow,
  MembershipRole,
  InviteRow,
  OrganizationRow,
  PermissionLevel,
  TaskRow,
  UserRow
} from "@/types/database";

export interface OrganizationWithMembership extends OrganizationRow {
  membership: {
    role: MembershipRole;
    permission_level: PermissionLevel;
  };
}

export interface TaskWithAssignee extends TaskRow {
  assignee: UserRow | null;
}

export interface TaskRecord extends TaskRow {
  assignee: Pick<UserRow, "id" | "full_name" | "email" | "avatar_url"> | null;
}

export interface MeetingWithNotes extends MeetingRow {
  notes: MeetingNoteRow[];
}

export interface MeetingWithDetails extends MeetingRow {
  notes: MeetingNoteRow[];
  attendees: Array<MeetingAttendeeRow & { user: UserRow | null }>;
  agendaItems: MeetingAgendaItemRow[];
}

export interface ActivityLogWithActor {
  id: string;
  organization_id: string;
  actor_user_id: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  actor: Pick<UserRow, "id" | "full_name" | "email" | "avatar_url"> | null;
}

export type InviteWithStatus = InviteRow;
