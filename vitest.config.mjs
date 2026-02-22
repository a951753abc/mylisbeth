import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      MONGODB_URI: "mongodb://localhost:27017/test_lisbeth",
    },
    include: ["server/**/*.test.js", "tests/**/*.test.js"],
    coverage: {
      provider: "v8",
      include: ["server/game/**/*.js"],
      exclude: ["server/game/**/*.test.js"],
      reporter: ["text", "html"],
      thresholds: {
        functions: 18,
        lines: 14,
      },
    },
  },
});
