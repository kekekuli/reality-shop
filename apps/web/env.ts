import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  // Server-only variables. Never exposed to the browser.
  server: {
    // Root of the API service; paths like /graphql are joined at the call site.
    API_URL: z.url(),
    SITE_URL: z.url(),
  },
  // Client variables would need a NEXT_PUBLIC_ prefix; none yet.
  client: {},
  // Next statically inlines process.env.X only where X is written out
  // literally, so each variable must be mapped here by hand.
  runtimeEnv: {
    API_URL: process.env.API_URL,
    SITE_URL: process.env.SITE_URL,
  },
  // Docker builds don't have real runtime values yet (see Dockerfile) —
  // official t3-env pattern: https://create.t3.gg/en/deployment/docker.
  // Only ever set during that build stage, never in the running
  // container, so the real check still runs — and fails loudly — at
  // actual startup if Dokploy misconfigures the env.
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
