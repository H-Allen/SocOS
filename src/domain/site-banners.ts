import { z } from "zod";

export const bannerPageSchema = z.enum(["home", "start", "teams", "people", "wiki"]);
export type BannerPage = z.infer<typeof bannerPageSchema>;

export const bannerPages: Array<{ id: BannerPage; label: string }> = [
  { id: "home", label: "Home" },
  { id: "start", label: "Start here" },
  { id: "teams", label: "Teams" },
  { id: "people", label: "People" },
  { id: "wiki", label: "Technical Wiki" },
];

export const bannerPathSchema = z.string().regex(
  /^societies\/hyped\/public\/banners\/[a-z]+-[a-f0-9-]+\.(?:jpg|png|webp)$/,
  "Invalid banner image path",
);

export type SiteBanners = Partial<Record<BannerPage, string>>;
export const bannerPositionSchema = z.coerce.number().min(0).max(100);
export type SiteBannerPositions = Partial<Record<BannerPage, number>>;
export type SiteBannerSettings = {
  banners: SiteBanners;
  positions: SiteBannerPositions;
};

export function publicMediaUrl(path: string | null | undefined) {
  return path ? `/api/media?path=${encodeURIComponent(path)}` : null;
}
