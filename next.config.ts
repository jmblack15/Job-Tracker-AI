import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@anthropic-ai/sdk", "@react-pdf/renderer"],
};

export default nextConfig;
