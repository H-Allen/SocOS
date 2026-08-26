"use client";

import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { browserSessionPersistence, getAuth, setPersistence } from "firebase/auth";

let authPromise: ReturnType<typeof createAuth> | null = null;

export function getBrowserAuth() {
  authPromise ??= createAuth();
  return authPromise;
}

async function createAuth() {
  const response = await fetch("/api/auth/config", { cache: "no-store" });
  if (!response.ok) throw new Error("Google sign-in has not been configured yet.");
  const config = await response.json() as FirebaseOptions;
  const app = getApps().find((candidate) => candidate.name === "hyped-editor")
    ?? initializeApp(config, "hyped-editor");
  const auth = getAuth(app);
  await setPersistence(auth, browserSessionPersistence);
  return auth;
}
