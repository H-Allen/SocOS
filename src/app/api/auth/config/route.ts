import { NextResponse } from "next/server";

type PublicFirebaseConfig = {
  apiKey?: string;
  appId?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
};

export function GET() {
  const config = firebaseWebConfig();
  if (!config.apiKey || !config.appId || !config.projectId) {
    return NextResponse.json({ error: "Firebase web authentication is not configured." }, { status: 503 });
  }
  return NextResponse.json(config, { headers: { "cache-control": "no-store" } });
}

function firebaseWebConfig(): PublicFirebaseConfig {
  if (process.env.FIREBASE_WEBAPP_CONFIG) {
    try {
      return JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG) as PublicFirebaseConfig;
    } catch {
      return {};
    }
  }
  return {
    apiKey: process.env.FIREBASE_WEB_API_KEY,
    appId: process.env.FIREBASE_WEB_APP_ID,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  };
}
