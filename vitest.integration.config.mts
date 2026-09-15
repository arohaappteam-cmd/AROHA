import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Runs *.integration.test.ts against the real DATABASE_URL from .env.
 * Kept separate from vitest.config.mts, whose exclude list skips these files.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.integration.test.ts"],
    environment: "node",
    setupFiles: ["dotenv/config"],
    // Tests share one database; run files one at a time.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
