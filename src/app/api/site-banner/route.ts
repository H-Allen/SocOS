import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { bannerPageSchema, bannerPositionSchema } from "@/domain/site-banners";
import { getCurrentEditor, requestHasSameOrigin } from "@/lib/firebase/editor-auth.server";
import { deletePublicSiteImage, savePublicSiteImage } from "@/lib/firebase/media.server";
import { clearSiteBanner, getSiteBannerSettings, setSiteBanner, setSiteBannerPosition } from "@/lib/firebase/site-banners.server";

export const runtime = "nodejs";

const imageTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export async function POST(request: Request) {
  const error = await editRequestError(request);
  if (error) return error;

  try {
    const form = await request.formData();
    const page = bannerPageSchema.parse(form.get("page"));
    const image = form.get("image");
    if (!(image instanceof File) || image.size === 0) return new NextResponse("Choose an image first.", { status: 400 });
    if (image.size > 6 * 1024 * 1024) return new NextResponse("Choose an image smaller than 6 MB.", { status: 413 });
    const extension = imageTypes[image.type as keyof typeof imageTypes];
    if (!extension) return new NextResponse("Use a JPG, PNG or WebP image.", { status: 415 });

    const previous = (await getSiteBannerSettings()).banners[page];
    const path = `societies/hyped/public/banners/${page}-${randomUUID()}.${extension}`;
    await savePublicSiteImage(path, Buffer.from(await image.arrayBuffer()), image.type);
    await setSiteBanner(page, path);
    await deleteOldBanner(previous);
    revalidateSite();
    return NextResponse.json({ ok: true });
  } catch {
    return new NextResponse("The cover could not be changed.", { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const error = await editRequestError(request);
  if (error) return error;

  try {
    const body = await request.json() as { page?: unknown };
    const page = bannerPageSchema.parse(body.page);
    const previous = (await getSiteBannerSettings()).banners[page];
    await clearSiteBanner(page);
    await deleteOldBanner(previous);
    revalidateSite();
    return NextResponse.json({ ok: true });
  } catch {
    return new NextResponse("The default cover could not be restored.", { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const error = await editRequestError(request);
  if (error) return error;

  try {
    const body = await request.json() as { page?: unknown; position?: unknown };
    const page = bannerPageSchema.parse(body.page);
    const position = bannerPositionSchema.parse(body.position);
    const settings = await getSiteBannerSettings();
    if (!settings.banners[page]) return new NextResponse("Add a cover image before repositioning it.", { status: 409 });
    await setSiteBannerPosition(page, position);
    revalidateSite();
    return NextResponse.json({ ok: true });
  } catch {
    return new NextResponse("The cover position could not be saved.", { status: 400 });
  }
}

async function editRequestError(request: Request) {
  if (!requestHasSameOrigin(request)) return new NextResponse("Invalid request origin.", { status: 403 });
  if (!(await getCurrentEditor())) return new NextResponse("Sign in with an approved account to edit this cover.", { status: 401 });
  return null;
}

async function deleteOldBanner(path?: string) {
  if (!path) return;
  await deletePublicSiteImage(path).catch(() => undefined);
}

function revalidateSite() {
  ["/", "/start", "/teams", "/people", "/wiki"].forEach((path) => revalidatePath(path));
}
