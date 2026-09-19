import { z } from "zod";

// Only public Web SDK fields may be embedded in the browser build.
const webConfigSchema = z.object({
  apiKey: z.string().min(1),
  appId: z.string().min(1),
  projectId: z.string().min(1),
  authDomain: z.string().regex(/^[a-zA-Z0-9.-]+$/),
  storageBucket: z.string().optional(),
  messagingSenderId: z.string().optional(),
});
export type PublicFirebaseConfig = z.infer<typeof webConfigSchema>;

export function parseFirebaseWebConfig(value: unknown): PublicFirebaseConfig | null {
  try {
    const parsed = webConfigSchema.safeParse(typeof value === "string" ? JSON.parse(value) : value);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function runtimeFirebaseWebConfig(env: Record<string, string | undefined>) {
  return parseFirebaseWebConfig(env.FIREBASE_WEBAPP_CONFIG) ?? parseFirebaseWebConfig({
    apiKey: env.FIREBASE_WEB_API_KEY,
    appId: env.FIREBASE_WEB_APP_ID,
    projectId: env.FIREBASE_PROJECT_ID,
    authDomain: env.FIREBASE_AUTH_DOMAIN,
    storageBucket: env.FIREBASE_STORAGE_BUCKET,
  });
}
