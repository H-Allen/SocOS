import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

import {
  bannerPageSchema,
  bannerPathSchema,
  bannerPositionSchema,
  type BannerPage,
  type SiteBannerSettings,
} from "@/domain/site-banners";
import { firebaseFirestoreAvailable, getAdminFirestore } from "@/lib/firebase/admin";
import { clearLocalSiteBanner, getLocalSiteBannerSettings, setLocalSiteBanner, setLocalSiteBannerPosition } from "@/lib/local-banners.server";

const settingsSchema = z.object({
  banners: z.object({
    home: bannerPathSchema.optional(),
    people: bannerPathSchema.optional(),
    start: bannerPathSchema.optional(),
    teams: bannerPathSchema.optional(),
    wiki: bannerPathSchema.optional(),
  }).default({}),
  bannerPositions: z.object({
    home: bannerPositionSchema.optional(),
    people: bannerPositionSchema.optional(),
    start: bannerPositionSchema.optional(),
    teams: bannerPositionSchema.optional(),
    wiki: bannerPositionSchema.optional(),
  }).default({}),
});

const settingsRef = () => getAdminFirestore().doc("societies/hyped/site/settings");

export async function getSiteBannerSettings(): Promise<SiteBannerSettings> {
  if (!firebaseFirestoreAvailable()) return getLocalSiteBannerSettings();
  try {
    const snapshot = await settingsRef().get();
    if (!snapshot.exists) return { banners: {}, positions: {} };
    const settings = settingsSchema.parse(snapshot.data());
    return { banners: settings.banners, positions: settings.bannerPositions };
  } catch {
    return { banners: {}, positions: {} };
  }
}

export async function setSiteBanner(page: BannerPage, path: string) {
  const safePage = bannerPageSchema.parse(page);
  const safePath = bannerPathSchema.parse(path);
  if (!firebaseFirestoreAvailable()) return setLocalSiteBanner(safePage, safePath);
  await settingsRef().set({
    banners: { [safePage]: safePath },
    bannerPositions: { [safePage]: 50 },
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function clearSiteBanner(page: BannerPage) {
  const safePage = bannerPageSchema.parse(page);
  if (!firebaseFirestoreAvailable()) return clearLocalSiteBanner(safePage);
  await settingsRef().update({
    [`banners.${safePage}`]: FieldValue.delete(),
    [`bannerPositions.${safePage}`]: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function setSiteBannerPosition(page: BannerPage, position: number) {
  const safePage = bannerPageSchema.parse(page);
  const safePosition = bannerPositionSchema.parse(position);
  if (!firebaseFirestoreAvailable()) return setLocalSiteBannerPosition(safePage, safePosition);
  await settingsRef().set({
    bannerPositions: { [safePage]: safePosition },
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}
