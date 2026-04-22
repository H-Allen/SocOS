import { NextResponse } from "next/server";

import { getSafeRedirectPath } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeRedirectPath(requestUrl.searchParams.get("next"), "/dashboard");

  if (code) {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const errorRedirect = new URL("/login", requestUrl.origin);
      errorRedirect.searchParams.set("error", "auth_callback_failed");
      return NextResponse.redirect(errorRedirect);
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
