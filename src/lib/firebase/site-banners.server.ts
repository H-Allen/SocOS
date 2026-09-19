import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { createAsyncCache } from "@/domain/async-cache";

import {
  bannerKey,
  normaliseBannerSettings,
  bannerPathSchema,
  bannerPositionSchema,
  type BannerPage,
  type SiteBannerSettings,
} from "@/domain/site-banners";
import { firebaseFirestoreAvailable, getAdminFirestore } from "@/lib/firebase/admin";
import { clearLocalSiteBanner, getLocalSiteBannerSettings, setLocalSiteBanner, setLocalSiteBannerPosition } from "@/lib/local-banners.server";

const settingsSchema = z.object({
  banners: z.record(z.string(), bannerPathSchema).default({}),
  bannerPositions: z.record(z.string(), bannerPositionSchema).default({}),
});

const settingsRef = () => getAdminFirestore().doc("societies/hyped/site/settings");

const settingsCache = createAsyncCache<SiteBannerSettings>(readSiteBannerSettings, { banners: {}, positions: {} }, 30_000, 1500);

export const getSiteBannerSettings = () => settingsCache.read();

async function readSiteBannerSettings(): Promise<SiteBannerSettings> {
  if (!firebaseFirestoreAvailable()) return getLocalSiteBannerSettings();
  const snapshot = await settingsRef().get();
  if (!snapshot.exists) return { banners: {}, positions: {} };
  const settings = settingsSchema.parse(snapshot.data());
  return normaliseBannerSettings(settings.banners, settings.bannerPositions);
}

export async function setSiteBanner(page: BannerPage, path: string) {
  const safePage = bannerKey(page);
  const safePath = bannerPathSchema.parse(path);
  if (!firebaseFirestoreAvailable()) {
    await setLocalSiteBanner(page, safePath);
    settingsCache.invalidate();
    return;
  }
  await settingsRef().set({
    banners: { [safePage]: safePath, ...(page === "Home" ? { wiki: FieldValue.delete() } : {}) },
    bannerPositions: { [safePage]: 50, ...(page === "Home" ? { wiki: FieldValue.delete() } : {}) },
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  settingsCache.invalidate();
}

export async function clearSiteBanner(page: BannerPage) {
  const safePage = bannerKey(page);
  if (!firebaseFirestoreAvailable()) {
    await clearLocalSiteBanner(page);
    settingsCache.invalidate();
    return;
  }
  await settingsRef().update({
    ...(page === "Home" ? { "banners.wiki": FieldValue.delete(), "bannerPositions.wiki": FieldValue.delete() } : {}),
    [`banners.${safePage}`]: FieldValue.delete(),
    [`bannerPositions.${safePage}`]: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  settingsCache.invalidate();
}

export async function setSiteBannerPosition(page: BannerPage, position: number) {
  const safePage = bannerKey(page);
  const safePosition = bannerPositionSchema.parse(position);
  if (!firebaseFirestoreAvailable()) {
    await setLocalSiteBannerPosition(page, safePosition);
    settingsCache.invalidate();
    return;
  }
  await settingsRef().set({
    bannerPositions: { [safePage]: safePosition },
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  settingsCache.invalidate();
}
