import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the root: a stray lockfile higher up the filesystem otherwise
    // confuses workspace-root detection.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
