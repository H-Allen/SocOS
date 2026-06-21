import { createBrowserFirebaseAdapter } from "@/lib/firebase/browser-adapter";

export function createBrowserBackendClient(): any {
  return createBrowserFirebaseAdapter();
}
