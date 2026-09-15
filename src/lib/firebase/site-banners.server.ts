import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

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

export async function getSiteBannerSettings(): Promise<SiteBannerSettings> {
  if (!firebaseFirestoreAvailable()) return getLocalSiteBannerSettings();
  try {
    const snapshot = await settingsRef().get();
    if (!snapshot.exists) return { banners: {}, positions: {} };
    const settings = settingsSchema.parse(snapshot.data());
    return normaliseBannerSettings(settings.banners, settings.bannerPositions);
  } catch {
    return { banners: {}, positions: {} };
  }
}

export async function setSiteBanner(page: BannerPage, path: string) {
  const safePage = bannerKey(page);
  const safePath = bannerPathSchema.parse(path);
  if (!firebaseFirestoreAvailable()) return setLocalSiteBanner(page, safePath);
  await settingsRef().set({
    banners: { [safePage]: safePath, ...(page === "Home" ? { wiki: FieldValue.delete() } : {}) },
    bannerPositions: { [safePage]: 50, ...(page === "Home" ? { wiki: FieldValue.delete() } : {}) },
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function clearSiteBanner(page: BannerPage) {
  const safePage = bannerKey(page);
  if (!firebaseFirestoreAvailable()) return clearLocalSiteBanner(page);
  await settingsRef().update({
    ...(page === "Home" ? { "banners.wiki": FieldValue.delete(), "bannerPositions.wiki": FieldValue.delete() } : {}),
    [`banners.${safePage}`]: FieldValue.delete(),
    [`bannerPositions.${safePage}`]: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function setSiteBannerPosition(page: BannerPage, position: number) {
  const safePage = bannerKey(page);
  const safePosition = bannerPositionSchema.parse(position);
  if (!firebaseFirestoreAvailable()) return setLocalSiteBannerPosition(page, safePosition);
  await settingsRef().set({
    bannerPositions: { [safePage]: safePosition },
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}
