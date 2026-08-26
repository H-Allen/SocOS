import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "hyped-web",
    timestamp: new Date().toISOString(),
  });
}
