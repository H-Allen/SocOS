"use server";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { MembershipRole } from "@/types";

const MAX_INVITES_PER_SUBMISSION = 20;

const emailSchema = z.string().email();

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

export type InviteResult = {
  email: string;
  status: "success" | "duplicate" | "error";
  message: string;
};

export async function sendInvites(
  organizationId: string,
  rawEmails: string[]
): Promise<{ results: InviteResult[]; error: string | null }> {
  // 1. Verify the calling user is authenticated and is a manager of this org
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { results: [], error: "Unauthenticated." };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("permission_level")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .returns<Array<{ permission_level: string }>>()
    .maybeSingle();

  if (membershipError || !membership) {
    return { results: [], error: "You are not a member of this organization." };
  }

  if (membership.permission_level !== "admin" && membership.permission_level !== "committee") {
    return { results: [], error: "You do not have permission to send invites." };
  }

  // 2. Sanitise and cap the email list
  const emails = rawEmails
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, MAX_INVITES_PER_SUBMISSION);

  if (!emails.length) {
    return { results: [], error: null };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const adminClient = createAdminSupabaseClient();

  // 3. Process each invite: store the record then dispatch a Supabase Auth invite email
  const results = await Promise.all(
    emails.map(async (email): Promise<InviteResult> => {
      const parsed = emailSchema.safeParse(email);
      if (!parsed.success) {
        return { email, status: "error", message: "Invalid email address." };
      }

      // Upsert the invite record (using admin client to avoid typed-client union issues)
      const { error: insertError } = await adminClient.from("invites").upsert(
        {
          organization_id: organizationId,
          email,
          invited_by: user.id,
          status: "pending",
          role: "member"
        },
        { onConflict: "organization_id,email", ignoreDuplicates: false }
      );

      if (insertError && insertError.code !== "23505") {
        return { email, status: "error", message: "Could not save invite record." };
      }

      // Send the actual invite email via Supabase Auth
      const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${appUrl}/auth/callback?next=/dashboard&invited_to=${organizationId}`
      });

      if (inviteError) {
        // If the user already exists in auth, that's fine — the invite record is saved
        // and they can be added to the org on their next sign-in.
        if (inviteError.message.toLowerCase().includes("already registered") ||
            inviteError.message.toLowerCase().includes("already been invited")) {
          return { email, status: "duplicate", message: "Already a Supabase user — invite saved." };
        }
        return { email, status: "error", message: inviteError.message };
      }

      return { email, status: "success", message: "Invite email sent." };
    })
  );

  // 4. Log the batch to activity_logs
  await adminClient.from("activity_logs").insert({
    organization_id: organizationId,
    actor_user_id: user.id,
    action: `invited ${results.filter((r) => r.status !== "error").length} team member(s)`,
    metadata: {
      invites: results.map((r) => ({ email: r.email, status: r.status }))
    }
  });


  return { results, error: null };
}
