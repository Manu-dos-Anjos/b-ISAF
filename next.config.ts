import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },

  // necessário para usar pdf-parse no server action
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;