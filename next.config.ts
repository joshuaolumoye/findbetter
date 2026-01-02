import { withSentryConfig } from "@sentry/nextjs";
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

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "vanta-studio",

  project: "findbetter",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
