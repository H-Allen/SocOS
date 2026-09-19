import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PATCH, POST } from "@/app/api/site-banner/route";
import { bannerKey } from "@/domain/site-banners";

const mocks = vi.hoisted(() => ({
  editor: vi.fn(), sameOrigin: vi.fn(), settings: vi.fn(),
  set: vi.fn(), clear: vi.fn(), position: vi.fn(), save: vi.fn(), remove: vi.fn(),
}));
vi.mock("@/lib/firebase/editor-auth.server", () => ({ getCurrentEditor: mocks.editor, requestHasSameOrigin: mocks.sameOrigin }));
vi.mock("@/lib/firebase/site-banners.server", () => ({
  getSiteBannerSettings: mocks.settings, setSiteBanner: mocks.set,
  clearSiteBanner: mocks.clear, setSiteBannerPosition: mocks.position,
}));
vi.mock("@/lib/firebase/media.server", () => ({ savePublicSiteImage: mocks.save, deletePublicSiteImage: mocks.remove }));
vi.mock("@/lib/wiki-cache.server", () => ({ getCachedWikiSnapshot: () => ({ pages: [{ id: "Home" }, { id: "v1.2" }] }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const oldImage = "societies/hyped/public/banners/wiki-11111111.jpg";
function request(method: string, body: unknown) {
  return new Request("http://localhost/api/site-banner", { method, body: JSON.stringify(body), headers: { "content-type": "application/json" } });
}

describe("Wiki banner API", () => {
  beforeEach(() => {
    mocks.editor.mockResolvedValue({ email: "editor@example.com" });
    mocks.sameOrigin.mockReturnValue(true);
    mocks.settings.mockResolvedValue({ banners: { [bannerKey("Home")]: oldImage }, positions: {} });
    mocks.remove.mockResolvedValue(undefined);
  });

  it("requires both a same-origin request and an approved editor", async () => {
    mocks.sameOrigin.mockReturnValue(false);
    expect((await DELETE(request("DELETE", { page: "Home" }))).status).toBe(403);
    mocks.sameOrigin.mockReturnValue(true);
    mocks.editor.mockResolvedValue(null);
    expect((await DELETE(request("DELETE", { page: "Home" }))).status).toBe(401);
    expect(mocks.clear).not.toHaveBeenCalled();
  });

  it("rejects page names absent from the Wiki", async () => {
    expect((await DELETE(request("DELETE", { page: "people" }))).status).toBe(400);
    expect(mocks.clear).not.toHaveBeenCalled();
  });

  it("stores an upload against the selected Wiki ID, never in its filename", async () => {
    const body = new FormData();
    body.set("page", "v1.2");
    body.set("image", new File(["image bytes"], "test.png", { type: "image/png" }));
    const response = await POST(new Request("http://localhost/api/site-banner", { method: "POST", body }));
    expect(response.status).toBe(200);
    expect(mocks.set).toHaveBeenCalledWith("v1.2", expect.stringMatching(/^societies\/hyped\/public\/banners\/wiki-[a-f0-9-]+\.png$/));
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("removes only the selected page's image when restoring its default", async () => {
    expect((await DELETE(request("DELETE", { page: "Home" }))).status).toBe(200);
    expect(mocks.clear).toHaveBeenCalledWith("Home");
    expect(mocks.remove).toHaveBeenCalledWith(oldImage);
  });

  it("saves crop positions only for pages with an image and rejects invalid positions", async () => {
    expect((await PATCH(request("PATCH", { page: "v1.2", position: 20 }))).status).toBe(409);
    expect((await PATCH(request("PATCH", { page: "Home", position: 101 }))).status).toBe(400);
    expect(mocks.position).not.toHaveBeenCalled();
    expect((await PATCH(request("PATCH", { page: "Home", position: 20 }))).status).toBe(200);
    expect(mocks.position).toHaveBeenCalledWith("Home", 20);
  });
});
