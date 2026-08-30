import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["mafs"], // ← ADICIONA ISTO
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-9d5adcd0a78f4b3ab94ea93681be0000.r2.dev",
        pathname: "/**",
      },
    ],
  },
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "192.168.43.81",
    "localhost",
  ],
};

export default nextConfig;