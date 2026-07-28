import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextIntlPlugin = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // This app lives in a pnpm monorepo; point Turbopack at the repo root
  // so it stops inferring the workspace root from stray lockfiles.
  turbopack: {
    root: "../..",
  },
};

export default nextIntlPlugin(nextConfig);
