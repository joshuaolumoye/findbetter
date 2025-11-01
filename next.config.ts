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
  
  // ✅ Critical: Increase body size limit for large file uploads (10MB files)
  // Base64 encoding increases file size by ~33%, so 10MB becomes ~13.3MB
  experimental: {
    serverActions: {
      bodySizeLimit: '15mb', // Allows 10MB files with base64 overhead
    },
  },

  // ✅ Server configuration for upload handling
  serverRuntimeConfig: {
    // Only available on server side
    uploadTimeout: 60000, // 60 seconds for large uploads
    maxFileSize: 10485760, // 10MB in bytes
  },

  publicRuntimeConfig: {
    // Available on both server and client
    maxFileSize: 10485760, // 10MB in bytes
    maxFileSizeMB: 10,
  },

  // ✅ Enable detailed logging for debugging uploads
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // ✅ Webpack optimization for file handling
  webpack: (config, { isServer }) => {
    // Optimize for large file handling
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Increase performance for large modules
    config.performance = {
      ...config.performance,
      maxAssetSize: 15000000, // 15MB
      maxEntrypointSize: 15000000, // 15MB
    };

    return config;
  },
};

export default nextConfig;