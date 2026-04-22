export type OrganizationType =
  | "sports_club"
  | "engineering_team"
  | "academic_society"
  | "finance_society"
  | "social_club"
  | "other";

export type MembershipRole = "president" | "secretary" | "treasurer" | "committee" | "member";
export type PermissionLevel = "admin" | "committee" | "member";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type ResourceType = "file" | "link" | "note";
export type InviteStatus = "pending" | "accepted" | "expired";

export interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

export interface OrganizationRow {
  id: string;
  name: string;
  university: string | null;
  type: OrganizationType | null;
  logo_url: string | null;
  created_by: string | null;
  created_at: string | null;
}

export interface MembershipRow {
  id: string;
  user_id: string;
  organization_id: string;
  role: MembershipRole;
  permission_level: PermissionLevel;
  joined_at: string | null;
}

export interface TaskRow {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  created_by: string | null;
  due_date: string | null;
  status: TaskStatus | null;
  priority: TaskPriority | null;
  recurring_rule: string | null;
  created_at: string | null;
}

export interface MeetingRow {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  created_by: string | null;
  created_at: string | null;
}

export interface MeetingNoteRow {
  id: string;
  meeting_id: string;
  content: string | null;
  created_at: string | null;
}

export interface ResourceRow {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  type: ResourceType;
  file_url: string | null;
  external_url: string | null;
  tags: string[] | null;
  uploaded_by: string | null;
  created_at: string | null;
}

export interface HandoverRow {
  id: string;
  organization_id: string;
  role_name: string;
  responsibilities: string | null;
  annual_timeline: string | null;
  key_contacts: string | null;
  advice: string | null;
  mistakes: string | null;
  checklist: unknown[] | null;
  updated_at: string | null;
}

export interface AnnouncementRow {
  id: string;
  organization_id: string;
  title: string;
  content: string | null;
  pinned: boolean | null;
  created_by: string | null;
  created_at: string | null;
}

export interface EventRow {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  created_at: string | null;
}

export interface ActivityLogRow {
  id: string;
  organization_id: string;
  actor_user_id: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

export interface InviteRow {
  id: string;
  organization_id: string;
  email: string;
  invited_by: string | null;
  status: InviteStatus;
  created_at: string | null;
}

type Tables = {
  users: UserRow;
  organizations: OrganizationRow;
  memberships: MembershipRow;
  tasks: TaskRow;
  meetings: MeetingRow;
  meeting_notes: MeetingNoteRow;
  resources: ResourceRow;
  handovers: HandoverRow;
  announcements: AnnouncementRow;
  events: EventRow;
  activity_logs: ActivityLogRow;
  invites: InviteRow;
};

type InsertShape<T extends keyof Tables> =
  T extends "users"
    ? {
        id: string;
        full_name?: string | null;
        email?: string | null;
        avatar_url?: string | null;
        created_at?: string | null;
      }
    : T extends "organizations"
      ? {
          id?: string;
          name: string;
          university?: string | null;
          type?: OrganizationType | null;
          logo_url?: string | null;
          created_by?: string | null;
          created_at?: string | null;
        }
      : T extends "memberships"
        ? {
            id?: string;
            user_id: string;
            organization_id: string;
            role: MembershipRole;
            permission_level: PermissionLevel;
            joined_at?: string | null;
          }
        : T extends "tasks"
          ? {
              id?: string;
              organization_id: string;
              title: string;
              description?: string | null;
              assigned_to?: string | null;
              created_by?: string | null;
              due_date?: string | null;
              status?: TaskStatus | null;
              priority?: TaskPriority | null;
              recurring_rule?: string | null;
              created_at?: string | null;
            }
          : T extends "meetings"
            ? {
                id?: string;
                organization_id: string;
                title: string;
                description?: string | null;
                start_time?: string | null;
                end_time?: string | null;
                created_by?: string | null;
                created_at?: string | null;
              }
            : T extends "meeting_notes"
              ? {
                  id?: string;
                  meeting_id: string;
                  content?: string | null;
                  created_at?: string | null;
                }
              : T extends "resources"
                ? {
                    id?: string;
                    organization_id: string;
                    title: string;
                    description?: string | null;
                    type: ResourceType;
                    file_url?: string | null;
                    external_url?: string | null;
                    tags?: string[] | null;
                    uploaded_by?: string | null;
                    created_at?: string | null;
                  }
                : T extends "handovers"
                  ? {
                      id?: string;
                      organization_id: string;
                      role_name: string;
                      responsibilities?: string | null;
                      annual_timeline?: string | null;
                      key_contacts?: string | null;
                      advice?: string | null;
                      mistakes?: string | null;
                      checklist?: unknown[] | null;
                      updated_at?: string | null;
                    }
                  : T extends "announcements"
                    ? {
                        id?: string;
                        organization_id: string;
                        title: string;
                        content?: string | null;
                        pinned?: boolean | null;
                        created_by?: string | null;
                        created_at?: string | null;
                      }
                    : T extends "events"
                      ? {
                          id?: string;
                          organization_id: string;
                          title: string;
                          description?: string | null;
                          start_time?: string | null;
                          end_time?: string | null;
                          location?: string | null;
                          created_at?: string | null;
                        }
                      : T extends "activity_logs"
                        ? {
                            id?: string;
                            organization_id: string;
                            actor_user_id?: string | null;
                            action: string;
                            metadata?: Record<string, unknown> | null;
                            created_at?: string | null;
                          }
                        : T extends "invites"
                          ? {
                              id?: string;
                              organization_id: string;
                              email: string;
                              invited_by?: string | null;
                              status?: InviteStatus;
                              created_at?: string | null;
                            }
                        : never;

type UpdateShape<T extends keyof Tables> = Partial<InsertShape<T>>;

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: InsertShape<"users">;
        Update: UpdateShape<"users">;
      };
      organizations: {
        Row: OrganizationRow;
        Insert: InsertShape<"organizations">;
        Update: UpdateShape<"organizations">;
      };
      memberships: {
        Row: MembershipRow;
        Insert: InsertShape<"memberships">;
        Update: UpdateShape<"memberships">;
      };
      tasks: {
        Row: TaskRow;
        Insert: InsertShape<"tasks">;
        Update: UpdateShape<"tasks">;
      };
      meetings: {
        Row: MeetingRow;
        Insert: InsertShape<"meetings">;
        Update: UpdateShape<"meetings">;
      };
      meeting_notes: {
        Row: MeetingNoteRow;
        Insert: InsertShape<"meeting_notes">;
        Update: UpdateShape<"meeting_notes">;
      };
      resources: {
        Row: ResourceRow;
        Insert: InsertShape<"resources">;
        Update: UpdateShape<"resources">;
      };
      handovers: {
        Row: HandoverRow;
        Insert: InsertShape<"handovers">;
        Update: UpdateShape<"handovers">;
      };
      announcements: {
        Row: AnnouncementRow;
        Insert: InsertShape<"announcements">;
        Update: UpdateShape<"announcements">;
      };
      events: {
        Row: EventRow;
        Insert: InsertShape<"events">;
        Update: UpdateShape<"events">;
      };
      activity_logs: {
        Row: ActivityLogRow;
        Insert: InsertShape<"activity_logs">;
        Update: UpdateShape<"activity_logs">;
      };
      invites: {
        Row: InviteRow;
        Insert: InsertShape<"invites">;
        Update: UpdateShape<"invites">;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
