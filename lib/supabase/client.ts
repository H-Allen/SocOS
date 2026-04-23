import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^['"]|['"]$/g, "") || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim().replace(/^['"]|['"]$/g, "") || "";
  
  if (!url || !key) {
    console.error("Supabase environment variables are missing! URL:", url, "Key length:", key.length);
  }

  const sanitizedUrl = url
    .replace(/\/rest\/v1\/?$/, "") // Remove /rest/v1 or /rest/v1/
    .replace(/\/$/, ""); // Remove trailing slash

  return createBrowserClient<Database>(sanitizedUrl, key);
}
