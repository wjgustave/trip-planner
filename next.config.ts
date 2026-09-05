import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @vibe/core is a client-side library shipping untranspiled ESM + CSS modules.
  transpilePackages: ["@vibe/core", "@vibe/icons"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
