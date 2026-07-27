import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Only run source tests; dist/ holds compiled CommonJS copies that
    // must not be picked up.
    include: ["src/**/*.test.ts"],
  },
});
