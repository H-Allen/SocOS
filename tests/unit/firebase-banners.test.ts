import { beforeEach, describe, expect, it, vi } from "vitest";
import { bannerKey } from "@/domain/site-banners";
import { clearSiteBanner, getSiteBannerSettings, setSiteBanner, setSiteBannerPosition } from "@/lib/firebase/site-banners.server";

const document = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/firebase/admin", () => ({
  firebaseFirestoreAvailable: () => true,
  getAdminFirestore: () => ({ doc: () => document }),
}));
const image = "societies/hyped/public/banners/wiki-11111111.jpg";

describe("Firestore Wiki banners", () => {
  beforeEach(() => document.get.mockResolvedValue({ exists: true, data: () => ({ banners: { wiki: image }, bannerPositions: { wiki: 24 } }) }));

  it("reads legacy Wiki images as Home banners", async () => {
    expect(await getSiteBannerSettings()).toEqual({
      banners: { [bannerKey("Home")]: image },
      positions: { [bannerKey("Home")]: 24 },
    });
  });

  it("merges a page upload and its crop without overwriting other pages", async () => {
    await setSiteBanner("v1.2", image);
    expect(document.set).toHaveBeenCalledWith(expect.objectContaining({
      banners: { [bannerKey("v1.2")]: image },
      bannerPositions: { [bannerKey("v1.2")]: 50 },
    }), { merge: true });
    await setSiteBannerPosition("v1.2", 42);
    expect(document.set).toHaveBeenLastCalledWith(expect.objectContaining({
      bannerPositions: { [bannerKey("v1.2")]: 42 },
    }), { merge: true });
  });

  it("clears the legacy Home alias as well as the encoded key", async () => {
    await clearSiteBanner("Home");
    expect(Object.keys(document.update.mock.calls[0][0]).sort()).toEqual([
      "banners.wiki", "bannerPositions.wiki", "banners." + bannerKey("Home"),
      "bannerPositions." + bannerKey("Home"), "updatedAt",
    ].sort());
  });

  it("does not clear Home when removing another page's banner", async () => {
    await clearSiteBanner("v1.2");
    expect(Object.keys(document.update.mock.calls[0][0]).sort()).toEqual([
      "banners." + bannerKey("v1.2"), "bannerPositions." + bannerKey("v1.2"), "updatedAt",
    ].sort());
  });
});
