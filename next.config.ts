import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["iyzipay", "web-push", "@netgsm/sms", "pdf-parse", "tesseract.js"],
};

export default nextConfig;
