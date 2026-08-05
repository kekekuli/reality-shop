import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextIntlPlugin = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // This app lives in a pnpm monorepo; point Turbopack at the repo root
  // so it stops inferring the workspace root from stray lockfiles.
  turbopack: {
    root: "../..",
  },
  // Next's dev server silently drops requests (including the HMR
  // WebSocket upgrade) whose Host header isn't one it expects, as a
  // DNS-rebinding guard. Only needed when reaching the dev server by
  // something other than localhost (e.g. a Tailscale IP) — optional and
  // machine-specific, so it comes from .env.local, never hardcoded here.
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS?.split(",").map((s) =>
    s.trim(),
  ),
  output: "standalone",
};

export default nextIntlPlugin(nextConfig);
