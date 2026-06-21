import { NextResponse } from "next/server";

import { getSafeRedirectPath } from "@/lib/auth";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = getSafeRedirectPath(requestUrl.searchParams.get("next"), "/dashboard");
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
