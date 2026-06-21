import { NextResponse } from "next/server";

import { FIREBASE_SESSION_COOKIE, FIREBASE_SESSION_MAX_AGE, ensureUserProfile } from "@/lib/firebase/session";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

async function acceptPendingInvites(uid: string, email: string | undefined) {
  if (!email) return;

  const pendingInvites = await adminDb
    .collection("invites")
    .where("email", "==", email.toLowerCase())
    .where("status", "==", "pending")
    .get();

  if (pendingInvites.empty) return;

  const now = new Date().toISOString();
  const batch = adminDb.batch();

  pendingInvites.docs.forEach((inviteDoc) => {
    const invite = inviteDoc.data();
    const organizationId = invite.organization_id as string | undefined;

    if (!organizationId) return;

    const membershipId = `${organizationId}_${uid}`;
    batch.set(
      adminDb.collection("memberships").doc(membershipId),
      {
        id: membershipId,
        user_id: uid,
        organization_id: organizationId,
        role: invite.role ?? "member",
        permission_level: invite.permission_level ?? "member",
        joined_at: now
      },
      { merge: true }
    );

    batch.update(inviteDoc.ref, {
      status: "accepted",
      accepted_at: now,
      accepted_by: uid
    });

    const activityRef = adminDb.collection("activity_logs").doc();
    batch.set(activityRef, {
      id: activityRef.id,
      organization_id: organizationId,
      actor_user_id: uid,
      action: "joined via invite",
      metadata: { invite_id: inviteDoc.id, email },
      created_at: now
    });
  });

  await batch.commit();
}

export async function POST(request: Request) {
  const { idToken } = (await request.json().catch(() => ({}))) as { idToken?: string };

  if (!idToken) {
    return NextResponse.json({ error: "Missing Firebase ID token." }, { status: 400 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: FIREBASE_SESSION_MAX_AGE * 1000
    });

    await ensureUserProfile(decoded.uid, {
      email: decoded.email ?? null,
      full_name: decoded.name ?? null,
      avatar_url: decoded.picture ?? null
    });
    await acceptPendingInvites(decoded.uid, decoded.email);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(FIREBASE_SESSION_COOKIE, sessionCookie, {
      maxAge: FIREBASE_SESSION_MAX_AGE,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    });

    return response;
  } catch (error) {
    console.error("[firebase-session]", error);
    return NextResponse.json({ error: "Invalid Firebase session." }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(FIREBASE_SESSION_COOKIE, "", {
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });

  return response;
}
