import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@acme/core", "@acme/db"],
};

export default nextConfig;
