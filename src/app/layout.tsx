import type { Metadata } from "next";
import { headers } from "next/headers";
import "katex/dist/katex.min.css";
import { pageMetadata } from "@/lib/page-metadata";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return {
    ...pageMetadata("HYPED Wiki | Hyperloop Edinburgh", "The GitHub Wiki for HYPED, the University of Edinburgh’s Hyperloop team."),
    metadataBase: new URL(process.env.HYPED_SITE_URL || `${protocol}://${host}`),
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
