import type { GithubWikiSnapshot } from "@/lib/github-wiki.server";

export interface SnapshotStore {
  read(): Promise<GithubWikiSnapshot | null>;
  acquire(owner: string, now: number): Promise<boolean>;
  publish(owner: string, snapshot: GithubWikiSnapshot, now: number): Promise<boolean>;
  releaseAfterFailure(owner: string, now: number): Promise<void>;
}

// Visitors only read memory seeded by the build. Remote work runs in a lifecycle-
// managed task after the response, with one refresh per instance and a fleet lease.
export function createSnapshotCache(options: {
  seed: GithubWikiSnapshot;
  store: SnapshotStore | null;
  fetchSnapshot: () => Promise<GithubWikiSnapshot>;
  owner: () => string;
  now?: () => number;
  onError: (error: unknown) => void;
}) {
  const now = options.now ?? Date.now;
  let current = options.seed;
  let nextCheck = 0;
  let scheduled = false;
  let pending: Promise<void> | undefined;
  let nextLocalRefresh = 0;
  let lastError: string | null = null;

  function adopt(snapshot: GithubWikiSnapshot | null) {
    if (snapshot?.status === "live" && snapshot.sourceUrl === current.sourceUrl
      && Date.parse(snapshot.syncedAt) >= Date.parse(current.syncedAt)) current = snapshot;
  }

  async function refresh() {
    const owner = options.owner();
    let acquired = false;
    try {
      if (options.store) {
        try {
          adopt(await options.store.read());
          lastError = null;
        } catch (error) {
          // A missing blob must be repairable. Still require the fleet lease
          // before contacting GitHub; a Firestore outage fails closed.
          lastError = "Wiki cache read failed; serving saved content";
          options.onError(error);
        }
        acquired = await options.store.acquire(owner, now());
        if (!acquired) return;
      } else {
        if (now() < nextLocalRefresh) return;
        nextLocalRefresh = now() + 300_000;
      }
      const fresh = await options.fetchSnapshot();
      if (fresh.status !== "live" || fresh.sourceUrl !== current.sourceUrl) throw new Error("Wiki refresh was incomplete; retaining last good snapshot");
      if (!options.store || await options.store.publish(owner, fresh, now())) adopt(fresh);
      lastError = null;
    } catch (error) {
      lastError = "Wiki refresh failed; serving saved content";
      options.onError(error);
      if (acquired) await options.store?.releaseAfterFailure(owner, now()).catch(options.onError);
    }
  }

  function maintain() {
    if (!pending) pending = refresh().finally(() => { pending = undefined; });
    return pending;
  }

  return {
    read(schedule: (work: () => Promise<void>) => void) {
      if (!scheduled && !pending && now() >= nextCheck) {
        scheduled = true;
        try {
          schedule(async () => {
            try { await maintain(); }
            finally { scheduled = false; nextCheck = now() + 60_000; }
          });
        } catch (error) {
          scheduled = false;
          nextCheck = now() + 60_000;
          options.onError(error);
        }
      }
      return current;
    },
    maintain,
    status: () => ({ syncedAt: current.syncedAt, ageSeconds: Math.max(0, Math.floor((now() - Date.parse(current.syncedAt)) / 1000)), refreshing: scheduled || Boolean(pending), lastError }),
  };
}
