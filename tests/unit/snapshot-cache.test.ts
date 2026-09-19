import { describe, expect, it, vi } from "vitest";
import { createSnapshotCache, type SnapshotStore } from "@/domain/snapshot-cache";
import { validateSnapshot } from "@/domain/wiki-snapshot";
import bundled from "@/generated/wiki-snapshot.json";

const seed = validateSnapshot(bundled, bundled.sourceUrl);
const fresh = { ...seed, syncedAt: new Date(Date.parse(seed.syncedAt) + 60_000).toISOString() };
const store = (): SnapshotStore => ({ read: vi.fn().mockResolvedValue(null), acquire: vi.fn().mockResolvedValue(true), publish: vi.fn().mockResolvedValue(true), releaseAfterFailure: vi.fn().mockResolvedValue(undefined) });

describe("Wiki snapshot coordinator", () => {
  it("serves 500 concurrent cold reads immediately and schedules exactly one refresh", async () => {
    const tasks: (() => Promise<void>)[] = [];
    const fetchSnapshot = vi.fn().mockResolvedValue(fresh);
    const shared = store();
    const cache = createSnapshotCache({ seed, store: shared, fetchSnapshot, owner: () => "a", onError: vi.fn() });
    for (let i = 0; i < 500; i++) expect(cache.read(work => tasks.push(work))).toBe(seed);
    expect(tasks).toHaveLength(1);
    expect(fetchSnapshot).not.toHaveBeenCalled();
    await tasks[0]();
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
    expect(cache.read(vi.fn())).toBe(fresh);
  });

  it("deduplicates explicit concurrent maintenance and propagates a shared snapshot without contacting GitHub", async () => {
    const shared = store();
    vi.mocked(shared.read).mockResolvedValue(fresh);
    vi.mocked(shared.acquire).mockResolvedValue(false);
    const fetchSnapshot = vi.fn();
    const cache = createSnapshotCache({ seed, store: shared, fetchSnapshot, owner: () => "a", onError: vi.fn() });
    await Promise.all(Array.from({ length: 100 }, () => cache.maintain()));
    expect(shared.read).toHaveBeenCalledTimes(1);
    expect(fetchSnapshot).not.toHaveBeenCalled();
    expect(cache.read(() => {})).toBe(fresh);
  });

  it.each(["partial", "unavailable"] as const)("does not publish %s refreshes or replace saved content", async status => {
    const shared = store();
    const cache = createSnapshotCache({ seed, store: shared, fetchSnapshot: async () => ({ ...fresh, status }), owner: () => "a", onError: vi.fn() });
    await cache.maintain();
    expect(shared.publish).not.toHaveBeenCalled();
    expect(shared.releaseAfterFailure).toHaveBeenCalledTimes(1);
    expect(cache.read(() => {})).toBe(seed);
    expect(cache.status().lastError).toBeTruthy();
  });

  it("retains content through a storage outage without starting uncoordinated GitHub work", async () => {
    const shared = store();
    vi.mocked(shared.read).mockRejectedValue(new Error("offline"));
    vi.mocked(shared.acquire).mockRejectedValue(new Error("offline"));
    const fetchSnapshot = vi.fn();
    const cache = createSnapshotCache({ seed, store: shared, fetchSnapshot, owner: () => "a", onError: vi.fn() });
    await cache.maintain();
    expect(fetchSnapshot).not.toHaveBeenCalled();
    expect(cache.read(() => {})).toBe(seed);
    vi.mocked(shared.read).mockResolvedValue(fresh);
    vi.mocked(shared.acquire).mockResolvedValue(false);
    await cache.maintain();
    expect(cache.status().lastError).toBeNull();
  });

  it("repairs a missing shared blob only after obtaining the fleet lease", async () => {
    const shared = store();
    vi.mocked(shared.read).mockRejectedValue(new Error("blob missing"));
    const cache = createSnapshotCache({ seed, store: shared, fetchSnapshot: async () => fresh, owner: () => "a", onError: vi.fn() });
    await cache.maintain();
    expect(shared.acquire).toHaveBeenCalledTimes(1);
    expect(shared.publish).toHaveBeenCalledTimes(1);
    expect(cache.read(() => {})).toBe(fresh);
  });

  it("does not adopt a result after losing its fleet lease", async () => {
    const shared = store();
    vi.mocked(shared.publish).mockResolvedValue(false);
    const cache = createSnapshotCache({ seed, store: shared, fetchSnapshot: async () => fresh, owner: () => "a", onError: vi.fn() });
    await cache.maintain();
    expect(cache.read(() => {})).toBe(seed);
  });

  it("never rolls back to an older shared snapshot and backs off scheduling", async () => {
    let now = Date.parse(fresh.syncedAt);
    const shared = store();
    vi.mocked(shared.read).mockResolvedValue(seed);
    vi.mocked(shared.acquire).mockResolvedValue(false);
    const tasks: (() => Promise<void>)[] = [];
    const cache = createSnapshotCache({ seed: fresh, store: shared, fetchSnapshot: vi.fn(), now: () => now, owner: () => "a", onError: vi.fn() });
    cache.read(work => tasks.push(work));
    await tasks[0]();
    expect(cache.read(work => tasks.push(work))).toBe(fresh);
    expect(tasks).toHaveLength(1);
    now += 60_000;
    cache.read(work => tasks.push(work));
    expect(tasks).toHaveLength(2);
  });

  it("validates the bundled baseline and rejects corrupt, partial or cross-repository snapshots", () => {
    expect(seed.pages.length).toBeGreaterThan(0);
    expect(() => validateSnapshot({ ...seed, pages: [] }, seed.sourceUrl)).toThrow();
    expect(() => validateSnapshot({ ...seed, status: "partial" }, seed.sourceUrl)).toThrow();
    expect(() => validateSnapshot(seed, "https://github.com/other/repo/wiki")).toThrow();
  });
});
