"use server";

import { cookies } from "next/headers";

import { adminDb } from "@/lib/firebase/admin";
import { getServerFirebaseUser } from "@/lib/firebase/session";
import { ACTIVE_ORG_COOKIE } from "@/lib/org-state";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Server Action: sets the active-org cookie as HttpOnly so it cannot be
 * read or tampered with by client-side JavaScript (XSS protection).
 * Validates that the requesting user is actually a member of the org before
 * setting the cookie, preventing cookie-stuffing attacks.
 */
export async function setActiveOrg(organizationId: string): Promise<void> {
  const user = await getServerFirebaseUser();

  if (!user) {
    return;
  }

  const membership = await adminDb.collection("memberships").doc(`${organizationId}_${user.uid}`).get();

  if (!membership.exists) {
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
