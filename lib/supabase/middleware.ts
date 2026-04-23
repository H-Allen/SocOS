import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";

const PROTECTED_PATHS = [
  "/dashboard",
  "/tasks",
  "/meetings",
  "/resources",
  "/handovers",
  "/members",
  "/calendar",
  "/announcements",
  "/settings",
  "/onboarding"
];
const AUTH_PATHS = ["/login", "/auth"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isAuthPath(pathname: string) {
  return AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^['"]|['"]$/g, "") || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim().replace(/^['"]|['"]$/g, "") || "";
  const sanitizedUrl = url
    .replace(/\/rest\/v1\/?$/, "") // Remove /rest/v1 or /rest/v1/
    .replace(/\/$/, ""); // Remove trailing slash

  const supabase = createServerClient<Database>(
    sanitizedUrl,
    key,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers
            }
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers
            }
          });
          response.cookies.set({ name, value: "", ...options, maxAge: 0 });
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthPath(request.nextUrl.pathname)) {
    // Only redirect to dashboard if we are on an auth path but NOT trying to sign up/onboard
    // To be safe, we let the page handle the logic if the user is authenticated.
    return response;
  }

  return response;
}
