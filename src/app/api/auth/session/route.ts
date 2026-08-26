import { NextResponse } from "next/server";

import {
  editorSessionCookie,
  editorSessionDurationMs,
  isApprovedEditorEmail,
  requestHasSameOrigin,
} from "@/lib/firebase/editor-auth.server";
import { firebaseAdminCredentialsAvailable, getAdminAuth } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!requestHasSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });

  try {
    const body = await request.json() as { idToken?: unknown };
    if (typeof body.idToken !== "string" || body.idToken.length > 10_000) throw new Error("Invalid token");
    const decoded = await getAdminAuth().verifyIdToken(body.idToken);
    const signedInRecently = decoded.auth_time * 1000 > Date.now() - 5 * 60 * 1000;
    if (!signedInRecently) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    if (!decoded.email_verified || !isApprovedEditorEmail(decoded.email)) {
      return NextResponse.json({ error: "This Google account is not approved to edit HYPED." }, { status: 403 });
    }

    const hasLongSession = firebaseAdminCredentialsAvailable();
    const session = hasLongSession
      ? await getAdminAuth().createSessionCookie(body.idToken, { expiresIn: editorSessionDurationMs })
      : body.idToken;
    const maxAge = hasLongSession ? editorSessionDurationMs / 1000 : 55 * 60;
    const response = NextResponse.json({ email: decoded.email });
    response.cookies.set(editorSessionCookie, session, {
      httpOnly: true,
      maxAge,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Google sign-in could not be verified." }, { status: 401 });
  }
}

export async function DELETE(request: Request) {
  if (!requestHasSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(editorSessionCookie);
  return response;
}
