import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: import.meta.dirname || process.cwd(),
  },
};

export default nextConfig;
