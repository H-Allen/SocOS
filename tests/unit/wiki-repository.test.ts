import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clone: vi.fn(), fetch: vi.fn(), listFiles: vi.fn(), resolveRef: vi.fn(),
  mkdtemp: vi.fn(), rm: vi.fn(),
}));
vi.mock("isomorphic-git", () => ({ default: mocks }));
vi.mock("node:fs/promises", () => ({ mkdtemp: mocks.mkdtemp, rm: mocks.rm }));

describe("Wiki directory discovery", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.mkdtemp.mockResolvedValue("/tmp/hyped-wiki-test");
    mocks.clone.mockResolvedValue(undefined);
    mocks.fetch.mockResolvedValue({ fetchHead: "next-commit" });
    mocks.resolveRef.mockResolvedValue("first-commit");
    mocks.listFiles.mockResolvedValue(["Home.md", "index/People.md"]);
    mocks.rm.mockResolvedValue(undefined);
  });

  it("shares concurrent reads and caches paths without touching the user clone", async () => {
    const { getWikiRepositoryPaths } = await import("@/lib/wiki-repository.server");
    const results = await Promise.all([getWikiRepositoryPaths("Hyp-ed/hyped-2027"), getWikiRepositoryPaths("Hyp-ed/hyped-2027")]);
    expect(results[0]).toEqual({ paths: ["Home.md", "index/People.md"], available: true });
    expect(results[1]).toEqual(results[0]);
    expect(mocks.clone).toHaveBeenCalledTimes(1);
    expect(mocks.clone).toHaveBeenCalledWith(expect.objectContaining({ dir: "/tmp/hyped-wiki-test", depth: 1, noCheckout: true }));
    await getWikiRepositoryPaths("Hyp-ed/hyped-2027");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("fetches fresh paths after expiry, including a removed index folder", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1000);
    const { getWikiRepositoryPaths } = await import("@/lib/wiki-repository.server");
    await getWikiRepositoryPaths("Hyp-ed/hyped-2027");
    now.mockReturnValue(62000);
    mocks.listFiles.mockResolvedValue(["Home.md"]);
    expect(await getWikiRepositoryPaths("Hyp-ed/hyped-2027")).toEqual({ paths: ["Home.md"], available: true });
    expect(mocks.listFiles).toHaveBeenLastCalledWith(expect.objectContaining({ ref: "next-commit" }));
  });

  it("retains known paths during a temporary failure and retries later", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1000);
    const { getWikiRepositoryPaths } = await import("@/lib/wiki-repository.server");
    await getWikiRepositoryPaths("Hyp-ed/hyped-2027");
    now.mockReturnValue(62000);
    mocks.fetch.mockRejectedValueOnce(new Error("offline"));
    expect(await getWikiRepositoryPaths("Hyp-ed/hyped-2027")).toEqual({ paths: ["Home.md", "index/People.md"], available: false });
    now.mockReturnValue(123000);
    expect((await getWikiRepositoryPaths("Hyp-ed/hyped-2027")).available).toBe(true);
  });

  it("cleans up only its own failed temporary clone and reports no invented paths", async () => {
    const { getWikiRepositoryPaths } = await import("@/lib/wiki-repository.server");
    mocks.clone.mockRejectedValueOnce(new Error("offline"));
    expect(await getWikiRepositoryPaths("Hyp-ed/hyped-2027")).toEqual({ paths: [], available: false });
    expect(mocks.rm).toHaveBeenCalledWith("/tmp/hyped-wiki-test", { recursive: true, force: true });
  });

  it("does not allow arbitrary remote repositories", async () => {
    const { getWikiRepositoryPaths } = await import("@/lib/wiki-repository.server");
    await expect(getWikiRepositoryPaths("https://other.example")).rejects.toThrow("Invalid Wiki repository");
    expect(mocks.clone).not.toHaveBeenCalled();
  });
});
