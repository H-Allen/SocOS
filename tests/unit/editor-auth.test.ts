import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentEditor } from "@/lib/firebase/editor-auth.server";

const auth = vi.hoisted(() => ({
  cookie: vi.fn(),
  credentials: vi.fn(),
  verifySessionCookie: vi.fn(),
  verifyIdToken: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: auth.cookie }) }));
vi.mock("@/lib/firebase/admin", () => ({
  firebaseAdminCredentialsAvailable: auth.credentials,
  getAdminAuth: () => auth,
}));

const account = {
  uid: "editor-id",
  email: "editor@example.com",
  email_verified: true,
  picture: "https://lh3.googleusercontent.com/account-photo",
};

describe("editor account photo", () => {
  beforeEach(() => {
    vi.stubEnv("HYPED_EDITOR_EMAILS", account.email);
    auth.cookie.mockReturnValue({ value: "verified-session" });
    auth.credentials.mockReturnValue(true);
    auth.verifySessionCookie.mockResolvedValue(account);
    auth.verifyIdToken.mockResolvedValue(account);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("includes the photo from the verified session, without changing approval checks", async () => {
    expect(await getCurrentEditor()).toEqual({
      uid: account.uid, email: account.email, photoUrl: account.picture,
    });
    expect(auth.verifySessionCookie).toHaveBeenCalledWith("verified-session", true);
  });

  it("also includes photos when using local ID-token sessions", async () => {
    auth.credentials.mockReturnValue(false);
    expect((await getCurrentEditor())?.photoUrl).toBe(account.picture);
    expect(auth.verifyIdToken).toHaveBeenCalledWith("verified-session");
  });

  it.each([undefined, "", "not a url", "http://example.com/photo", "javascript:alert(1)", "https://name:password@example.com/photo"])(
    "omits missing or unsafe photo URLs (%s) so the UI can show an initial",
    async (picture) => {
      auth.verifySessionCookie.mockResolvedValue({ ...account, picture });
      expect(await getCurrentEditor()).toMatchObject({ email: account.email });
      expect((await getCurrentEditor())?.photoUrl).toBeUndefined();
    },
  );

  it("does not expose an unapproved or unverified account's profile", async () => {
    auth.verifySessionCookie.mockResolvedValue({ ...account, email: "other@example.com" });
    expect(await getCurrentEditor()).toBeNull();
    auth.verifySessionCookie.mockResolvedValue({ ...account, email_verified: false });
    expect(await getCurrentEditor()).toBeNull();
  });

  it("returns no profile when signed out", async () => {
    auth.cookie.mockReturnValue(undefined);
    expect(await getCurrentEditor()).toBeNull();
    expect(auth.verifySessionCookie).not.toHaveBeenCalled();
  });
});
