import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

  // Permite aceder ao servidor de dev via túnel Cloudflare
  // (sem isto, os chunks JS de /_next/* ficam bloqueados por
  // cross-origin e o React nunca hidrata — formulários "recarregam"
  // em vez de correr o onSubmit).
  allowedDevOrigins: [
    "*.trycloudflare.com",
  ],
};

export default nextConfig;