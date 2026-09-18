import type { Metadata } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import "katex/dist/katex.min.css";
import { pageMetadata } from "@/lib/page-metadata";

import "./globals.css";

const bodyFont = localFont({
  src: [
    { path: "./fonts/raleway-latin.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/raleway-latin-italic.woff2", weight: "100 900", style: "italic" },
  ],
  display: "swap",
  variable: "--font-body",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});

const displayFont = localFont({
  src: "./fonts/libre-baskerville-latin.woff2",
  display: "swap",
  variable: "--font-display",
  weight: "400 700",
  fallback: ["Georgia", "serif"],
  adjustFontFallback: "Times New Roman",
});

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
    <html className={`${bodyFont.variable} ${displayFont.variable}`} lang="en">
      <body>{children}</body>
    </html>
  );
}
