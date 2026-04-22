export * from "@/types/database";

import type {
  MeetingNoteRow,
  MeetingRow,
  MembershipRole,
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

export interface MeetingWithNotes extends MeetingRow {
  notes: MeetingNoteRow[];
}
