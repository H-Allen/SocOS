import { NextResponse, type NextRequest } from "next/server";

const FIREBASE_SESSION_COOKIE = "__session";

const protectedPrefixes = [
  "/dashboard",
  "/tasks",
  "/meetings",
  "/resources",
  "/members",
  "/calendar",
  "/announcements",
  "/handovers",
  "/settings",
  "/onboarding"
];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(FIREBASE_SESSION_COOKIE)?.value);

  if (isProtectedPath(pathname) && !hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if ((pathname === "/login" || pathname.startsWith("/auth")) && hasSession) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}
