import { NextResponse } from "next/server";
import { parseFirebaseWebConfig, runtimeFirebaseWebConfig } from "@/domain/firebase-web-config";

export function GET() {
  const config = runtimeFirebaseWebConfig(process.env)
    ?? parseFirebaseWebConfig(process.env.NEXT_PUBLIC_HYPED_FIREBASE_CONFIG);
  if (!config) {
    return NextResponse.json({ error: "Firebase web authentication is not configured." }, { status: 503 });
  }
  return NextResponse.json(config, { headers: { "cache-control": "no-store" } });
}
