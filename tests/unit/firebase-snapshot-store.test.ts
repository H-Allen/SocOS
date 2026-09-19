import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFirebaseSnapshotStore } from "@/lib/firebase/wiki-snapshot-store.server";
import { validateSnapshot } from "@/domain/wiki-snapshot";
import bundled from "@/generated/wiki-snapshot.json";

const backend = vi.hoisted(() => ({
  data: {} as Record<string, unknown>, blobs: new Map<string, Buffer>(), now: 1000,
  save: vi.fn(), download: vi.fn(), failUpload: false,
}));
vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => ({
    doc: () => ({ get: async () => ({ data: () => backend.data }) }),
    runTransaction: async (work: (transaction: unknown) => Promise<unknown>) => work({
      get: async () => ({ data: () => backend.data }),
      set: (_ref: unknown, data: Record<string, unknown>, options?: { merge: boolean }) => {
        backend.data = options?.merge ? { ...backend.data, ...data } : data;
      },
    }),
  }),
  getAdminStorage: () => ({ bucket: () => ({ file: (path: string) => ({
    save: async (bytes: Buffer) => { backend.save(path); if (backend.failUpload) throw new Error("upload failed"); backend.blobs.set(path, bytes); },
    download: async () => { backend.download(path); return [backend.blobs.get(path)]; },
  }) }) }),
}));

const seed = validateSnapshot(bundled, bundled.sourceUrl);
const repository = seed.sourceUrl.replace("https://github.com/", "").replace(/\/wiki$/, "");
const makeStore = () => createFirebaseSnapshotStore(repository, () => backend.now);
beforeEach(() => { backend.data = {}; backend.blobs.clear(); backend.now = 1000; backend.failUpload = false; });

describe("durable Wiki snapshot store", () => {
  it("leases once across instances, publishes complete content, and rate limits the next refresh", async () => {
    const a = makeStore(); const b = makeStore();
    expect(await a.acquire("a", backend.now)).toBe(true);
    expect(await b.acquire("b", backend.now)).toBe(false);
    expect(await a.publish("a", seed, backend.now)).toBe(true);
    expect(await b.read()).toEqual(seed);
    expect(await b.acquire("b", backend.now)).toBe(false);
    backend.now += 300_001;
    expect(await b.acquire("b", backend.now)).toBe(true);
    expect(await a.publish("a", seed, backend.now)).toBe(false);
  });
  it("checks lease expiry at commit time, not the time the upload began", async () => {
    const store = makeStore();
    await store.acquire("a", backend.now);
    backend.now += 120_001;
    expect(await store.publish("a", seed, 1000)).toBe(false);
    expect(backend.data.blob).toBeUndefined();
  });
  it("preserves the old pointer when upload fails, and releases only its own lease", async () => {
    const store = makeStore();
    await store.acquire("a", backend.now);
    await store.publish("a", seed, backend.now);
    const blob = backend.data.blob;
    backend.now += 300_001;
    await store.acquire("b", backend.now);
    backend.failUpload = true;
    await expect(store.publish("b", seed, backend.now)).rejects.toThrow("upload failed");
    expect(backend.data.blob).toBe(blob);
    await store.releaseAfterFailure("a", backend.now);
    expect(backend.data.leaseOwner).toBe("b");
    await store.releaseAfterFailure("b", backend.now);
    expect(backend.data.leaseOwner).toBe("");
    expect(await store.read()).toEqual(seed);
  });
  it("reuses unchanged content while updating freshness across instances", async () => {
    const store = makeStore();
    await store.acquire("a", backend.now);
    await store.publish("a", seed, backend.now);
    await store.read();
    backend.now += 300_001;
    await store.acquire("b", backend.now);
    const fresh = { ...seed, syncedAt: new Date(Date.parse(seed.syncedAt) + 300_000).toISOString() };
    await store.publish("b", fresh, backend.now);
    expect(backend.blobs.size).toBe(1);
    expect(await store.read()).toEqual(fresh);
    expect(backend.download).toHaveBeenCalledTimes(1);
    expect(await makeStore().read()).toEqual(fresh);
  });
  it("rejects pointers outside its own cache prefix", async () => {
    backend.data = { blob: "societies/hyped/public/banners/image.jpg" };
    await expect(makeStore().read()).rejects.toThrow("Invalid Wiki cache blob");
    expect(backend.download).not.toHaveBeenCalled();
  });
});
