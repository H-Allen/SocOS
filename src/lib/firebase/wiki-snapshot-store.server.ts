import "server-only";
import { createHash } from "node:crypto";
import { gzip, gunzip } from "node:zlib";
import { promisify } from "node:util";
import { z } from "zod";
import type { SnapshotStore } from "@/domain/snapshot-cache";
import { validateSnapshot } from "@/domain/wiki-snapshot";
import type { GithubWikiSnapshot } from "@/lib/github-wiki.server";
import { getAdminFirestore, getAdminStorage } from "./admin";

const compress = promisify(gzip);
const decompress = promisify(gunzip);
const headSchema = z.object({
  blob: z.string().optional(), leaseOwner: z.string().optional(), leaseUntil: z.number().default(0),
  nextRefreshAt: z.number().default(0),
  syncedAt: z.string().datetime().optional(),
});

export function createFirebaseSnapshotStore(repository: string, clock = Date.now): SnapshotStore {
  const key = createHash("sha256").update(repository).digest("hex").slice(0, 24);
  const prefix = `wiki-cache/v1/${key}/`;
  const head = () => getAdminFirestore().doc(`wikiCache/${key}-v1`);
  const sourceUrl = `https://github.com/${repository}/wiki`;
  let cachedBlob: string | undefined;
  let cachedSnapshot: GithubWikiSnapshot | null = null;

  return {
    async read() {
      const data = headSchema.parse((await head().get()).data() ?? {});
      if (!data.blob) return null;
      if (!data.blob.startsWith(prefix) || !/\/[a-f0-9]{64}\.json\.gz$/.test(data.blob)) throw new Error("Invalid Wiki cache blob");
      if (data.blob === cachedBlob && cachedSnapshot) return { ...cachedSnapshot, syncedAt: data.syncedAt ?? cachedSnapshot.syncedAt };
      const [bytes] = await getAdminStorage().bucket().file(data.blob).download();
      const decoded = await decompress(bytes, { maxOutputLength: 32 * 1024 * 1024 });
      cachedSnapshot = validateSnapshot(JSON.parse(decoded.toString("utf8")), sourceUrl);
      cachedBlob = data.blob;
      return { ...cachedSnapshot, syncedAt: data.syncedAt ?? cachedSnapshot.syncedAt };
    },
    acquire(owner, now) {
      return getAdminFirestore().runTransaction(async (transaction) => {
        const ref = head();
        const data = headSchema.parse((await transaction.get(ref)).data() ?? {});
        if (data.leaseUntil > now || data.nextRefreshAt > now) return false;
        transaction.set(ref, { leaseOwner: owner, leaseUntil: now + 120_000 }, { merge: true });
        return true;
      });
    },
    async publish(owner, snapshot) {
      validateSnapshot(snapshot, sourceUrl);
      // The head carries the freshness timestamp. Identical content reuses one
      // blob instead of accumulating a new object every five minutes.
      const bytes = await compress(JSON.stringify({ ...snapshot, syncedAt: "1970-01-01T00:00:00.000Z" }));
      const blob = `${prefix}${createHash("sha256").update(bytes).digest("hex")}.json.gz`;
      await getAdminStorage().bucket().file(blob).save(bytes, {
        resumable: false, metadata: { contentType: "application/gzip", cacheControl: "private, max-age=0" },
      });
      // Publish the pointer only after the complete immutable blob exists. A
      // worker whose lease expired cannot overwrite a newer worker's result.
      return getAdminFirestore().runTransaction(async (transaction) => {
        const ref = head();
        const data = headSchema.parse((await transaction.get(ref)).data() ?? {});
        const now = clock();
        if (data.leaseOwner !== owner || data.leaseUntil <= now) return false;
        transaction.set(ref, { blob, syncedAt: snapshot.syncedAt, leaseOwner: "", leaseUntil: 0, nextRefreshAt: now + 300_000 });
        return true;
      });
    },
    async releaseAfterFailure(owner, now) {
      await getAdminFirestore().runTransaction(async (transaction) => {
        const ref = head();
        const data = headSchema.parse((await transaction.get(ref)).data() ?? {});
        if (data.leaseOwner === owner) transaction.set(ref, { leaseOwner: "", leaseUntil: 0, nextRefreshAt: now + 60_000 }, { merge: true });
      });
    },
  };
}
