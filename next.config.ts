import type { NextConfig } from "next";
import { runtimeFirebaseWebConfig } from "./src/domain/firebase-web-config";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  reactStrictMode: true,
  poweredByHeader: false,
  // App Hosting supplies FIREBASE_WEBAPP_CONFIG at build time, not runtime.
  // Never embed the whole environment or Admin SDK credentials here.
  env: { NEXT_PUBLIC_HYPED_FIREBASE_CONFIG: JSON.stringify(runtimeFirebaseWebConfig(process.env)) },
  async redirects() {
    return ["/start", "/teams", "/people"].map((source) => ({ source, destination: "/", permanent: true }));
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
