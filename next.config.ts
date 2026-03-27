import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  serverExternalPackages: [
    "iyzipay",
    "web-push",
    "@netgsm/sms",
    "pdf-parse",
    "tesseract.js",
    "xlsx",
    "isomorphic-dompurify",
    "@sentry/nextjs",
    "inngest",
  ],

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 3600,
  },

  // Compression
  compress: true,

  // Headers for caching
  async headers() {
    return [
      {
        source: "/api/tenders",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=120" },
        ],
      },
      {
        source: "/api/health/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      {
        // Static assets — long cache
        source: "/:path*.:ext(js|css|woff2|png|jpg|svg|ico)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
