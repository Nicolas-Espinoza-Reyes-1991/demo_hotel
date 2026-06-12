import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  ...(basePath ? { basePath } : {}),
  images: {
    ...(basePath ? { unoptimized: true as const } : {}),
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
