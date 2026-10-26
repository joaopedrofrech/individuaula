import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { buildApiHeaders, buildSecurityHeaders } from "./lib/security-headers";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [
      { source: "/:path*", headers: buildSecurityHeaders({ isDev: process.env.NODE_ENV !== "production" }) },
      { source: "/api/:path*", headers: buildApiHeaders() },
    ];
  },
};

export default nextConfig;

// expõe os bindings da Cloudflare durante o `next dev`.
initOpenNextCloudflareForDev();
