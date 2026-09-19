import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/internal/wiki-sync/route";
const cache = vi.hoisted(() => ({ refresh: vi.fn(), status: vi.fn().mockReturnValue({ lastError: null }) }));
vi.mock("@/lib/wiki-cache.server", () => ({ refreshWikiSnapshot: cache.refresh, getWikiCacheStatus: cache.status }));
afterEach(() => vi.unstubAllEnvs());
const request = (authorization = "") => new Request("http://localhost/api/internal/wiki-sync", { method: "POST", headers: { authorization } });
describe("internal Wiki sync endpoint", () => {
  it("is disabled without a sufficiently long secret", async () => {
    vi.stubEnv("HYPED_WIKI_SYNC_SECRET", "short");
    expect((await POST(request())).status).toBe(503);
    expect(cache.refresh).not.toHaveBeenCalled();
  });
  it("does not refresh without the exact bearer token", async () => {
    vi.stubEnv("HYPED_WIKI_SYNC_SECRET", "x".repeat(32));
    expect((await POST(request("Bearer wrong"))).status).toBe(401);
    expect(cache.refresh).not.toHaveBeenCalled();
  });
  it("refreshes authorized requests and does not cache the result", async () => {
    vi.stubEnv("HYPED_WIKI_SYNC_SECRET", "x".repeat(32));
    const response = await POST(request(`Bearer ${"x".repeat(32)}`));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(cache.refresh).toHaveBeenCalledTimes(1);
  });
});
