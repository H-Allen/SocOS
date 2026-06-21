"use server";

import { z } from "zod";

import { adminDb } from "@/lib/firebase/admin";
import { getServerFirebaseUser } from "@/lib/firebase/session";

const MAX_INVITES_PER_SUBMISSION = 20;
const emailSchema = z.string().email();

export type InviteResult = {
  email: string;
  status: "success" | "duplicate" | "error";
  message: string;
};

export async function sendInvites(
  organizationId: string,
  rawEmails: string[]
): Promise<{ results: InviteResult[]; error: string | null }> {
  const user = await getServerFirebaseUser();

  if (!user) {
    return { results: [], error: "Unauthenticated." };
  }

  const membership = await adminDb.collection("memberships").doc(`${organizationId}_${user.uid}`).get();
  const permissionLevel = membership.data()?.permission_level;

  if (!membership.exists) {
    return { results: [], error: "You are not a member of this organization." };
  }

  if (permissionLevel !== "admin" && permissionLevel !== "committee") {
    return { results: [], error: "You do not have permission to send invites." };
  }

  const emails = rawEmails
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, MAX_INVITES_PER_SUBMISSION);

  if (!emails.length) {
    return { results: [], error: null };
  }

  const now = new Date().toISOString();
  const batch = adminDb.batch();
  const results = await Promise.all(
    emails.map(async (email): Promise<InviteResult> => {
      const parsed = emailSchema.safeParse(email);

      if (!parsed.success) {
        return { email, status: "error", message: "Invalid email address." };
      }

      const existingInvite = await adminDb
        .collection("invites")
        .where("organization_id", "==", organizationId)
        .where("email", "==", email)
        .where("status", "==", "pending")
        .limit(1)
        .get();

      if (!existingInvite.empty) {
        return { email, status: "duplicate", message: "Invite already pending." };
      }

      const ref = adminDb.collection("invites").doc();
      batch.set(ref, {
        id: ref.id,
        organization_id: organizationId,
        email,
        invited_by: user.uid,
        status: "pending",
        role: "member",
        created_at: now
      });

      return { email, status: "success", message: "Invite saved. Email delivery can be enabled with Firebase Functions." };
    })
  );

  const sentCount = results.filter((result) => result.status !== "error").length;
  const activityRef = adminDb.collection("activity_logs").doc();
  batch.set(activityRef, {
    id: activityRef.id,
    organization_id: organizationId,
    actor_user_id: user.uid,
    action: `invited ${sentCount} team member(s)`,
    metadata: {
      invites: results.map((result) => ({ email: result.email, status: result.status }))
    },
    created_at: now
  });

  await batch.commit();

  return { results, error: null };
}
