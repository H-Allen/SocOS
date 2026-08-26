import type { Metadata } from "next";
import { Libre_Baskerville, Raleway } from "next/font/google";
import "katex/dist/katex.min.css";

import "./globals.css";

const bodyFont = Raleway({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-body",
  weight: "variable",
});

const displayFont = Libre_Baskerville({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-display",
  weight: "variable",
});

export const metadata: Metadata = {
  title: {
    default: "HYPED",
    template: "%s",
  },
  description: "The public home, onboarding guide and technical knowledge hub for HYPED at the University of Edinburgh.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className={`${bodyFont.variable} ${displayFont.variable}`} lang="en">
      <body>{children}</body>
    </html>
  );
}
