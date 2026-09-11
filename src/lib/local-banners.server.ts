import "server-only";

import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { BannerPage, SiteBannerSettings, SiteBanners } from "@/domain/site-banners";

const root = join(process.cwd(), ".local-data");
const settingsPath = join(root, "site-banners.json");

export async function getLocalSiteBannerSettings(): Promise<SiteBannerSettings> {
  try {
    const stored = JSON.parse(await readFile(settingsPath, "utf8")) as SiteBannerSettings | SiteBanners;
    if ("banners" in stored) return stored as SiteBannerSettings;
    return { banners: stored as SiteBanners, positions: {} };
  } catch {
    return { banners: {}, positions: {} };
  }
}

export async function setLocalSiteBanner(page: BannerPage, path: string) {
  const settings = await getLocalSiteBannerSettings();
  settings.banners[page] = path;
  settings.positions[page] = 50;
  await writeLocalSettings(settings);
}

export async function clearLocalSiteBanner(page: BannerPage) {
  const settings = await getLocalSiteBannerSettings();
  delete settings.banners[page];
  delete settings.positions[page];
  await writeLocalSettings(settings);
}

export async function setLocalSiteBannerPosition(page: BannerPage, position: number) {
  const settings = await getLocalSiteBannerSettings();
  settings.positions[page] = position;
  await writeLocalSettings(settings);
}

export async function saveLocalSiteImage(path: string, bytes: Buffer) {
  const target = localMediaPath(path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, bytes);
}

export async function getLocalSiteImage(path: string) {
  const bytes = await readFile(localMediaPath(path));
  return { bytes, contentType: contentTypeFor(path) };
}

export async function deleteLocalSiteImage(path: string) {
  await rm(localMediaPath(path), { force: true });
}

async function writeLocalSettings(settings: SiteBannerSettings) {
  await mkdir(root, { recursive: true });
  const temporary = `${settingsPath}.new`;
  await writeFile(temporary, JSON.stringify(settings, null, 2));
  await rename(temporary, settingsPath);
}

function localMediaPath(path: string) {
  if (!path.startsWith("societies/hyped/public/") || path.includes("..")) throw new Error("Invalid local media path");
  return join(root, path);
}

function contentTypeFor(path: string) {
  if (path.endsWith(".jpg")) return "image/jpeg";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  throw new Error("Unsupported local media type");
}
