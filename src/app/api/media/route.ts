import { getPublicSiteImage } from "@/lib/firebase/media.server";

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path");
  if (!path) return new Response("Image path required", { status: 400 });
  try {
    const image = await getPublicSiteImage(path);
    return new Response(new Uint8Array(image.bytes), {
      headers: {
        "Cache-Control": "public, max-age=86400",
        "Content-Type": image.contentType,
      },
    });
  } catch {
    return new Response("Image not found", { status: 404 });
  }
}
