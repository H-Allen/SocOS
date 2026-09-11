import type { Metadata } from "next";
import "katex/dist/katex.min.css";

import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
