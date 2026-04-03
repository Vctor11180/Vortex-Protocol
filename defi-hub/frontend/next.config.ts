import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  // Aseguramos que Vercel maneje correctamente los recursos estáticos en el monorepo
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
