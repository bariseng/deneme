import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["iyzipay", "web-push", "@netgsm/sms", "pdf-parse", "tesseract.js", "xlsx", "isomorphic-dompurify"],
};

export default nextConfig;
