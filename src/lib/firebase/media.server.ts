import { firebaseStorageAvailable, getAdminStorage } from "@/lib/firebase/admin";
import { deleteLocalSiteImage, getLocalSiteImage, saveLocalSiteImage } from "@/lib/local-banners.server";

export async function getPublicSiteImage(path: string) {
  const allowed = path.startsWith("societies/hyped/public/homepage/")
    || path.startsWith("societies/hyped/public/banners/");
  if (!allowed || path.includes("..")) {
    throw new Error("Invalid HYPED media path");
  }
  if (!firebaseStorageAvailable()) return getLocalSiteImage(path);
  const file = getAdminStorage().bucket().file(path);
  const [[bytes], [metadata]] = await Promise.all([file.download(), file.getMetadata()]);
  const contentType = metadata.contentType;
  if (!contentType || !["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
    throw new Error("Unsupported HYPED media type");
  }
  return { bytes, contentType };
}

export async function savePublicSiteImage(path: string, bytes: Buffer, contentType: string) {
  if (!firebaseStorageAvailable()) return saveLocalSiteImage(path, bytes);
  await getAdminStorage().bucket().file(path).save(bytes, {
    metadata: { cacheControl: "public, max-age=31536000, immutable", contentType },
    resumable: false,
  });
}

export async function deletePublicSiteImage(path: string) {
  if (!firebaseStorageAvailable()) return deleteLocalSiteImage(path);
  await getAdminStorage().bucket().file(path).delete({ ignoreNotFound: true });
}
