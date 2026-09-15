import type { Metadata } from "next";

export function pageMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    openGraph: {
      title, description, siteName: "HYPED", locale: "en_GB", type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "HYPED, Hyperloop Edinburgh. Member guides and technical documentation." }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
  };
}
