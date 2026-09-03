import withPWA from "@ducanh2912/next-pwa";

const withPWAConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/.*$/,
        handler: "NetworkFirst",
        options: {
          cacheName: "supabase-api-cache",
          expiration: { maxEntries: 100, maxAgeSeconds: 300 },
          networkTimeoutSeconds: 8,
        },
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|webp|gif)$/,
        handler: "CacheFirst",
        options: {
          cacheName: "image-cache",
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
      {
        urlPattern: /^\/models\/.*$/,
        handler: "CacheFirst",
        options: {
          cacheName: "face-models-cache",
          expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 90 },
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withPWAConfig(nextConfig);