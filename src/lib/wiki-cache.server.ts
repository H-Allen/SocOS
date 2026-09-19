import "server-only";
import { randomUUID } from "node:crypto";
import { after } from "next/server";
import bundledSnapshot from "@/generated/wiki-snapshot.json";
import { createSnapshotCache } from "@/domain/snapshot-cache";
import { validateSnapshot } from "@/domain/wiki-snapshot";
import { firebaseFirestoreAvailable, firebaseStorageAvailable } from "@/lib/firebase/admin";
import { createFirebaseSnapshotStore } from "@/lib/firebase/wiki-snapshot-store.server";
import { GITHUB_WIKI_REPOSITORY } from "@/domain/wiki-config";

const sharedStoreAvailable = firebaseFirestoreAvailable() && firebaseStorageAvailable();
const wikiCache = createSnapshotCache({
  seed: validateSnapshot(bundledSnapshot, `https://github.com/${GITHUB_WIKI_REPOSITORY}/wiki`),
  store: sharedStoreAvailable ? createFirebaseSnapshotStore(GITHUB_WIKI_REPOSITORY) : null,
  fetchSnapshot: async () => {
    if (process.env.NODE_ENV === "production" && !sharedStoreAvailable) {
      throw new Error("Shared Wiki cache requires Firestore and Storage in production; serving bundled snapshot");
    }
    const { getGithubWikiSnapshot } = await import("@/lib/github-wiki.server");
    return getGithubWikiSnapshot();
  },
  owner: randomUUID,
  onError: (error) => console.error("[wiki-cache]", error instanceof Error ? error.message : "Refresh failed"),
});

export function getCachedWikiSnapshot() {
  return wikiCache.read((work) => after(work));
}

export const refreshWikiSnapshot = wikiCache.maintain;
export const getWikiCacheStatus = wikiCache.status;
