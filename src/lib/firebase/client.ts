"use client";

import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { browserSessionPersistence, getAuth, setPersistence } from "firebase/auth";
import { parseFirebaseWebConfig } from "@/domain/firebase-web-config";

let authPromise: ReturnType<typeof createAuth> | null = null;

export function getBrowserAuth() {
  authPromise ??= createAuth().catch((error) => {
    authPromise = null;
    throw error;
  });
  return authPromise;
}

async function createAuth() {
  let config: FirebaseOptions | null = parseFirebaseWebConfig(process.env.NEXT_PUBLIC_HYPED_FIREBASE_CONFIG);
  if (!config) {
    const response = await fetch("/api/auth/config", { cache: "no-store" });
    if (!response.ok) throw new Error("Google sign-in has not been configured for this deployment.");
    config = parseFirebaseWebConfig(await response.json());
  }
  if (!config) throw new Error("Firebase web configuration is incomplete.");
  const app = getApps().find((candidate) => candidate.name === "hyped-editor")
    ?? initializeApp(config, "hyped-editor");
  const auth = getAuth(app);
  await setPersistence(auth, browserSessionPersistence);
  return auth;
}
