import { afterEach, describe, expect, it, vi } from "vitest";
import { createAsyncCache } from "@/domain/async-cache";

afterEach(() => vi.useRealTimers());
describe("shared settings cache", () => {
  it("coalesces 500 reads and caches successful results", async () => {
    const load = vi.fn().mockResolvedValue("saved");
    const cache = createAsyncCache(load, "default", 30_000, 1500);
    expect(await Promise.all(Array.from({ length: 500 }, () => cache.read()))).toEqual(Array(500).fill("saved"));
    expect(await cache.read()).toBe("saved");
    expect(load).toHaveBeenCalledTimes(1);
  });
  it("times out and keeps the last successful settings", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const load = vi.fn<() => Promise<string>>().mockResolvedValueOnce("saved").mockImplementation(() => new Promise(() => {}));
    const cache = createAsyncCache(load, "default", 30_000, 1500);
    expect(await cache.read()).toBe("saved");
    await vi.advanceTimersByTimeAsync(30_001);
    const pending = cache.read();
    await vi.advanceTimersByTimeAsync(1500);
    expect(await pending).toBe("saved");
  });
  it("prevents a read begun before an edit from overwriting the new cache", async () => {
    let resolve!: (value: string) => void;
    const load = vi.fn<() => Promise<string>>().mockImplementationOnce(() => new Promise(r => { resolve = r; })).mockResolvedValue("edited");
    const cache = createAsyncCache(load, "default", 30_000, 1500);
    const old = cache.read();
    await Promise.resolve();
    cache.invalidate();
    expect(await cache.read()).toBe("edited");
    resolve("old");
    await old;
    expect(await cache.read()).toBe("edited");
  });
});
