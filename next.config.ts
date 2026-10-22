import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  // Código del navegador sin minificar: si algo falla, el mensaje de error dice exactamente dónde.
  webpack: (config, { isServer, dev }) => {
    if (!isServer && !dev) config.optimization.minimize = false;
    return config;
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
