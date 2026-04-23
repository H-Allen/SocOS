import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

import type { Database } from "@/types/database";

export function createServerSupabaseClient() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^['"]|['"]$/g, "") || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim().replace(/^['"]|['"]$/g, "") || "";
  const sanitizedUrl = url
    .replace(/\/rest\/v1\/?$/, "") // Remove /rest/v1 or /rest/v1/
    .replace(/\/$/, ""); // Remove trailing slash

  return createServerClient<Database>(
    sanitizedUrl,
    key,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Server Components cannot always mutate cookies. Middleware handles refresh persistence.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
          } catch {
            // Server Components cannot always mutate cookies. Middleware handles refresh persistence.
          }
        }
      }
    }
  );
}
