import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Single-port hosts (the preview gateway) can only reach this app, so the
  // separate staff website (:3001, its own Next.js process) is reverse-
  // proxied under /staff/* — the staff app builds with basePath "/staff".
  // In production the staff site should get its own domain instead; remove
  // this rewrite there.
  async rewrites() {
    const staffOrigin = process.env.STAFF_ORIGIN ?? "http://127.0.0.1:3001";
    return [
      { source: "/staff", destination: `${staffOrigin}/staff` },
      { source: "/staff/:path*", destination: `${staffOrigin}/staff/:path*` },
    ];
  },
};

export default nextConfig;
