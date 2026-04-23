"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { OrganizationType, TaskPriority } from "@/types";

function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase admin credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// ─── Create Organisation ────────────────────────────────────────────────────

type CreateOrgInput = {
  name: string;
  university: string;
  type: OrganizationType;
  logoUrl: string | null;
  userId: string;
};

export async function createOrganizationWithMembership(
  input: CreateOrgInput
): Promise<{ organizationId: string; error: string | null }> {
  const supabase = createServerSupabaseClient();
  const adminClient = createAdminSupabaseClient();

  // Verify the session matches the supplied userId
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user || user.id !== input.userId) {
    return { organizationId: "", error: "Unauthenticated." };
  }

  // Use admin client for the atomic creation to bypass RLS select restrictions
  const { data: org, error: orgError } = await adminClient
    .from("organizations")
    .insert({
      name: input.name,
      university: input.university,
      type: input.type,
      logo_url: input.logoUrl,
      created_by: user.id
    })
    .select("id")
    .single();

  if (orgError || !org) {
    console.error("[createOrg]", orgError);
    return { organizationId: "", error: orgError?.message ?? "Failed to create organization." };
  }

  const { error: memError } = await adminClient.from("memberships").insert({
    user_id: user.id,
    organization_id: org.id,
    role: "president",
    permission_level: "admin"
  });

  if (memError) {
    console.error("[createOrg membership]", memError);
    // Attempt cleanup to avoid orphaned orgs
    await adminClient.from("organizations").delete().eq("id", org.id);
    return { organizationId: "", error: memError.message };
  }

  return { organizationId: org.id, error: null };
}

// ─── Seed Template ──────────────────────────────────────────────────────────

type TaskSeed = {
  title: string;
  description: string;
  priority: TaskPriority;
  dueOffsetDays: number;
};

type MeetingSeed = {
  title: string;
  description: string;
  startOffsetDays: number;
};

type AnnouncementSeed = {
  title: string;
  content: string;
};

export type TemplateSeedInput = {
  organizationId: string;
  userId: string;
  templateKey: string;
  tasks: TaskSeed[];
  meeting: MeetingSeed;
  handoverRoles: string[];
  announcement: AnnouncementSeed;
};

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

export async function seedTemplate(
  input: TemplateSeedInput
): Promise<{ error: string | null }> {
  const supabase = createServerSupabaseClient();
  const untypedSupabase = supabase as any;

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user || user.id !== input.userId) {
    return { error: "Unauthenticated." };
  }

  // Verify the user is an admin of this org
  const { data: membership } = await supabase
    .from("memberships")
    .select("permission_level")
    .eq("organization_id", input.organizationId)
    .eq("user_id", user.id)
    .returns<Array<{ permission_level: string }>>()
    .maybeSingle();

  if (!membership || membership.permission_level !== "admin") {
    return { error: "You do not have permission to seed this organization." };
  }

  const now = new Date();
  const meetingStart = addDays(now, input.meeting.startOffsetDays);
  const meetingEnd = new Date(meetingStart);
  meetingEnd.setHours(meetingEnd.getHours() + 1);

  const [tasksResult, meetingResult, handoverResult, announcementResult, activityResult] =
    await Promise.all([
      untypedSupabase.from("tasks").insert(
        input.tasks.map((task) => ({
          organization_id: input.organizationId,
          title: task.title,
          description: task.description,
          assigned_to: user.id,
          created_by: user.id,
          due_date: addDays(now, task.dueOffsetDays).toISOString().slice(0, 10),
          status: "todo" as const,
          priority: task.priority
        }))
      ),
      untypedSupabase.from("meetings").insert({
        organization_id: input.organizationId,
        title: input.meeting.title,
        description: input.meeting.description,
        start_time: meetingStart.toISOString(),
        end_time: meetingEnd.toISOString(),
        created_by: user.id
      }),
      untypedSupabase.from("handovers").insert(
        input.handoverRoles.map((roleName) => ({
          organization_id: input.organizationId,
          role_name: roleName
        }))
      ),
      untypedSupabase.from("announcements").insert({
        organization_id: input.organizationId,
        title: input.announcement.title,
        content: input.announcement.content,
        pinned: true,
        created_by: user.id
      }),
      untypedSupabase.from("activity_logs").insert({
        organization_id: input.organizationId,
        actor_user_id: user.id,
        action: `completed onboarding with the ${input.templateKey.replace("_", " ")} template`,
        metadata: { template: input.templateKey }
      })
    ]);

  const firstError = [
    tasksResult.error,
    meetingResult.error,
    handoverResult.error,
    announcementResult.error,
    activityResult.error
  ].find(Boolean);

  if (firstError) {
    console.error("[seedTemplate]", firstError);
    return { error: firstError.message };
  }

  return { error: null };
}
