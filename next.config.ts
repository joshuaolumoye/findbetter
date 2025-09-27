import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // ✅ Allow production builds even if there are type errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // ✅ Allow production builds even if ESLint errors exist
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
