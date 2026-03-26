import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["iyzipay", "web-push", "@netgsm/sms"],
};

export default nextConfig;
