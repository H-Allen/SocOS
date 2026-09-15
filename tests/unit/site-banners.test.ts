import { beforeEach, describe, expect, it, vi } from "vitest";
import { bannerKey, bannerPageSchema, normaliseBannerSettings } from "@/domain/site-banners";
import { clearLocalSiteBanner, getLocalSiteBannerSettings, setLocalSiteBanner, setLocalSiteBannerPosition } from "@/lib/local-banners.server";

const files = vi.hoisted(() => new Map<string, string>());
vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(),
  readFile: vi.fn(async (path: string) => {
    if (!files.has(path)) throw new Error("ENOENT");
    return files.get(path);
  }),
  writeFile: vi.fn(async (path: string, value: string) => { files.set(path, value); }),
  rename: vi.fn(async (from: string, to: string) => { files.set(to, files.get(from)!); files.delete(from); }),
  rm: vi.fn(),
}));

const first = "societies/hyped/public/banners/wiki-11111111-1111-1111-1111-111111111111.jpg";
const second = "societies/hyped/public/banners/wiki-22222222-2222-2222-2222-222222222222.png";
const settingsPath = process.cwd() + "/.local-data/site-banners.json";

describe("Wiki page banners", () => {
  beforeEach(() => files.clear());

  it("uses distinct, Firestore-safe keys for Wiki IDs including punctuation and Unicode", () => {
    const keys = ["Home", "home", "C++", "v1.2", "v1-2", "Control & testing", "Überblick"].map(bannerKey);
    expect(new Set(keys).size).toBe(keys.length);
    keys.forEach((key) => expect(key).toMatch(/^page-[a-f0-9-]+$/));
    for (const value of ["", "bad/page", "bad\\page", "bad\npage"]) {
      expect(bannerPageSchema.safeParse(value).success).toBe(false);
    }
  });

  it("starts without custom images and keeps each page's image and crop independent", async () => {
    expect(await getLocalSiteBannerSettings()).toEqual({ banners: {}, positions: {} });
    await setLocalSiteBanner("Home", first);
    await setLocalSiteBanner("v1.2", second);
    await setLocalSiteBannerPosition("v1.2", 23);
    expect(await getLocalSiteBannerSettings()).toEqual({
      banners: { [bannerKey("Home")]: first, [bannerKey("v1.2")]: second },
      positions: { [bannerKey("Home")]: 50, [bannerKey("v1.2")]: 23 },
    });
    await clearLocalSiteBanner("Home");
    expect(await getLocalSiteBannerSettings()).toEqual({
      banners: { [bannerKey("v1.2")]: second },
      positions: { [bannerKey("v1.2")]: 23 },
    });
  });

  it("resets the crop when replacing an image", async () => {
    await setLocalSiteBanner("Home", first);
    await setLocalSiteBannerPosition("Home", 90);
    await setLocalSiteBanner("Home", second);
    expect((await getLocalSiteBannerSettings()).positions[bannerKey("Home")]).toBe(50);
  });

  it("migrates the old Wiki banner to Home only and never resurrects it after removal", async () => {
    files.set(settingsPath, JSON.stringify({ banners: { wiki: first, home: second }, positions: { wiki: 31 } }));
    const migrated = await getLocalSiteBannerSettings();
    expect(migrated.banners[bannerKey("Home")]).toBe(first);
    expect(migrated.positions[bannerKey("Home")]).toBe(31);
    expect(migrated.banners[bannerKey("Other")]).toBeUndefined();
    await clearLocalSiteBanner("Home");
    expect((await getLocalSiteBannerSettings()).banners).toEqual({ home: second });
  });

  it("reads legacy flat settings and prefers an explicit page image over the legacy image", async () => {
    files.set(settingsPath, JSON.stringify({ wiki: first }));
    expect((await getLocalSiteBannerSettings()).banners[bannerKey("Home")]).toBe(first);
    const result = normaliseBannerSettings({ wiki: first, [bannerKey("Home")]: second }, { [bannerKey("Home")]: 72 });
    expect(result.banners).toEqual({ [bannerKey("Home")]: second });
    expect(result.positions[bannerKey("Home")]).toBe(72);
  });

  it("preserves a newly saved crop while the cloud still has a legacy Wiki image", () => {
    expect(normaliseBannerSettings({ wiki: first }, { wiki: 10, [bannerKey("Home")]: 80 }).positions[bannerKey("Home")]).toBe(80);
  });
});
