"use server";

import { cookies } from "next/headers";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ACTIVE_ORG_COOKIE } from "@/lib/org-state";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Server Action: sets the active-org cookie as HttpOnly so it cannot be
 * read or tampered with by client-side JavaScript (XSS protection).
 * Validates that the requesting user is actually a member of the org before
 * setting the cookie, preventing cookie-stuffing attacks.
 */
export async function setActiveOrg(organizationId: string): Promise<void> {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return;
  }

  // Verify membership before trusting the org ID
  const { data: membership } = await supabase
    .from("memberships")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    // Not a member — refuse to set the cookie
    return;
  }

  const cookieStore = cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR_SECONDS
  });
}
