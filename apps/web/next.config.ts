// Loaded here so env validation runs at startup (next.config runs earliest),
// failing the build/dev server immediately if a required var is missing.
import "./env";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextIntlPlugin = createNextIntlPlugin();

// Root of the API service. The browser only ever talks to the web origin
// (:6767); these paths are forwarded to the API so client-side requests stay
// same-origin and never hit CORS.
const API_URL = process.env.API_URL ?? "http://localhost:7676";

const nextConfig: NextConfig = {
  // This app lives in a pnpm monorepo; point Turbopack at the repo root
  // so it stops inferring the workspace root from stray lockfiles.
  turbopack: {
    root: "../..",
  },
  async rewrites() {
    return [
      { source: "/graphql", destination: `${API_URL}/graphql` },
      { source: "/api/:path*", destination: `${API_URL}/:path*` },
    ];
  },
};

export default nextIntlPlugin(nextConfig);
