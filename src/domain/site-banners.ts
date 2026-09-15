import { z } from "zod";

// Page IDs come from GitHub, not from the site's former standalone routes.
export const bannerPageSchema = z.string().min(1).max(150).regex(/^[^/\\\\\u0000-\u001f\u007f]+$/);
export type BannerPage = z.infer<typeof bannerPageSchema>;

export const bannerPathSchema = z.string().regex(
  /^societies\/hyped\/public\/banners\/[a-z]+-[a-f0-9-]+\.(?:jpg|png|webp)$/,
  "Invalid banner image path",
);
export const bannerPositionSchema = z.coerce.number().min(0).max(100);
export type SiteBanners = Partial<Record<string, string>>;
export type SiteBannerPositions = Partial<Record<string, number>>;
export type SiteBannerSettings = { banners: SiteBanners; positions: SiteBannerPositions };

// Firestore map keys must not interpret punctuation in Wiki titles as field paths.
export function bannerKey(page: BannerPage) {
  return "page-" + Array.from(bannerPageSchema.parse(page), (character) => character.codePointAt(0)!.toString(16)).join("-");
}

export function normaliseBannerSettings(banners: SiteBanners, positions: SiteBannerPositions): SiteBannerSettings {
  const next = { banners: { ...banners }, positions: { ...positions } };
  const home = bannerKey("Home");
  // Preserve the previous Wiki-wide image on Wiki Home, not on every page.
  if (next.banners.wiki && !next.banners[home]) {
    next.banners[home] = next.banners.wiki;
    next.positions[home] = next.positions[home] ?? next.positions.wiki ?? 50;
  }
  delete next.banners.wiki;
  delete next.positions.wiki;
  return next;
}

export function publicMediaUrl(path: string | null | undefined) {
  return path ? `/api/media?path=${encodeURIComponent(path)}` : null;
}
