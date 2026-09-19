import { NextResponse } from "next/server";
import { getWikiCacheStatus } from "@/lib/wiki-cache.server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "hyped-web",
    timestamp: new Date().toISOString(),
    wiki: getWikiCacheStatus(),
  }, { headers: { "Cache-Control": "no-store" } });
}
