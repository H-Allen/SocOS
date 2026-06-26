import { cookies } from "next/headers";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { UserRow } from "@/types";

export const FIREBASE_SESSION_COOKIE = "__session";
export const FIREBASE_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export async function getServerFirebaseUser() {
  const sessionCookie = cookies().get(FIREBASE_SESSION_COOKIE)?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    return await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch {
    return null;
  }
}

export async function ensureUserProfile(uid: string, fallback?: Partial<UserRow>): Promise<UserRow> {
  const ref = adminDb.collection("users").doc(uid);
  const snap = await ref.get();
  const now = new Date().toISOString();

  if (!snap.exists) {
    const profile: UserRow = {
      id: uid,
      full_name: fallback?.full_name ?? null,
      email: fallback?.email ?? null,
      phone: fallback?.phone ?? null,
      avatar_url: fallback?.avatar_url ?? null,
      created_at: now
    };

    await ref.set(profile);
    return profile;
  }

  const existing = { id: snap.id, ...snap.data() } as UserRow;
  const updates: Partial<UserRow> = {};

  if (!existing.email && fallback?.email) updates.email = fallback.email;
  if (!existing.full_name && fallback?.full_name) updates.full_name = fallback.full_name;
  if (!existing.phone && fallback?.phone) updates.phone = fallback.phone;
  if (!existing.avatar_url && fallback?.avatar_url) updates.avatar_url = fallback.avatar_url;

  if (Object.keys(updates).length) {
    await ref.set(updates, { merge: true });
    return { ...existing, ...updates };
  }

  return existing;
}
