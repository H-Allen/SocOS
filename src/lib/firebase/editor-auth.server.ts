import "server-only";

import { cookies } from "next/headers";

import { firebaseAdminCredentialsAvailable, getAdminAuth } from "@/lib/firebase/admin";

export const editorSessionCookie = "__session";
export const editorSessionDurationMs = 5 * 24 * 60 * 60 * 1000;

export type CurrentEditor = {
  email: string;
  uid: string;
  photoUrl?: string;
};

export function isApprovedEditorEmail(email: string | undefined) {
  if (!email) return false;
  const approved = new Set(
    (process.env.HYPED_EDITOR_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLocaleLowerCase())
      .filter(Boolean),
  );
  return approved.has(email.toLocaleLowerCase());
}

export async function getCurrentEditor(): Promise<CurrentEditor | null> {
  const session = (await cookies()).get(editorSessionCookie)?.value;
  if (!session) return null;

  try {
    const decoded = firebaseAdminCredentialsAvailable()
      ? await getAdminAuth().verifySessionCookie(session, true)
      : await getAdminAuth().verifyIdToken(session);
    if (!decoded.email_verified || !isApprovedEditorEmail(decoded.email)) return null;
    return { email: decoded.email!, uid: decoded.uid, photoUrl: accountPhotoUrl(decoded.picture) };
  } catch {
    return null;
  }
}

function accountPhotoUrl(value: unknown) {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function requestHasSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const expectedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return Boolean(expectedHost) && new URL(origin).host === expectedHost;
  } catch {
    return false;
  }
}
