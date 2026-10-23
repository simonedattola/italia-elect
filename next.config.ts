import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/archivio/**": ["./src/data/generated/**/*.json"],
    "/api/**": ["./src/data/generated/**/*.json"],
    "/simulatore": ["./src/data/generated/**/*.json"],
    "/condividi": ["./src/data/generated/**/*.json"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
