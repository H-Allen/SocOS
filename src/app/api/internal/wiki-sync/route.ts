import { createHash, timingSafeEqual } from "node:crypto";
import { refreshWikiSnapshot, getWikiCacheStatus } from "@/lib/wiki-cache.server";

export const runtime = "nodejs";
export const maxDuration = 120;

// Optional scheduler endpoint. No credentials are accepted in URLs, and a
// missing/short secret disables it. It cannot bypass the fleet refresh lease.
export async function POST(request: Request) {
  const secret = process.env.HYPED_WIKI_SYNC_SECRET;
  if (!secret || secret.length < 32) return new Response("Sync endpoint is not configured", { status: 503 });
  const authorization = request.headers.get("authorization") ?? "";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(digest(authorization), digest(`Bearer ${secret}`))) return new Response("Unauthorized", { status: 401 });
  await refreshWikiSnapshot();
  const status = getWikiCacheStatus();
  return Response.json(status, { status: status.lastError ? 503 : 200, headers: { "Cache-Control": "no-store" } });
}
