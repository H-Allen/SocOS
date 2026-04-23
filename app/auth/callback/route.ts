import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getSafeRedirectPath } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { MembershipRole } from "@/types";

function createAdminSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const invitedTo = requestUrl.searchParams.get("invited_to"); // org ID from invite email link
  const next = getSafeRedirectPath(requestUrl.searchParams.get("next"), "/dashboard");

  if (code) {
    const supabase = createServerSupabaseClient();
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !sessionData?.user) {
      const errorRedirect = new URL("/login", requestUrl.origin);
      errorRedirect.searchParams.set("error", "auth_callback_failed");
      return NextResponse.redirect(errorRedirect);
    }

    const user = sessionData.user;

    // Process pending invites for this email address.
    // We use the admin client to bypass RLS for the membership insert,
    // since the user may not have a membership record yet.
    try {
      const adminClient = createAdminSupabaseClient();

      // Look up all pending invites for this email
      const { data: pendingInvites } = await adminClient
        .from("invites")
        .select("*")
        .eq("email", user.email!)
        .eq("status", "pending");

      if (pendingInvites && pendingInvites.length > 0) {
        await Promise.all(
          pendingInvites.map(async (invite) => {
            // Add the user to the org (ignore conflicts if already a member)
            await adminClient.from("memberships").upsert(
              {
                user_id: user.id,
                organization_id: invite.organization_id,
                role: (invite.role as MembershipRole) ?? "member",
                permission_level: "member"
              },
              { onConflict: "user_id,organization_id", ignoreDuplicates: true }
            );

            // Mark the invite as accepted
            await adminClient
              .from("invites")
              .update({ status: "accepted" })
              .eq("id", invite.id);

            // Log the join event
            await adminClient.from("activity_logs").insert({
              organization_id: invite.organization_id,
              actor_user_id: user.id,
              action: "joined via invite",
              metadata: { invite_id: invite.id, email: user.email }
            });
          })
        );
      }

      // If the URL contains an invited_to org, redirect there after login
      if (invitedTo) {
        const dashboardUrl = new URL("/dashboard", requestUrl.origin);
        return NextResponse.redirect(dashboardUrl);
      }
    } catch (err) {
      // Non-fatal: log and continue to dashboard
      console.error("[auth/callback] invite processing error:", err);
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}

