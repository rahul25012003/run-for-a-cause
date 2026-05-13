import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Vitest configuration for RunForACause frontend.
 *
 * Run with:
 *   npm test           # one-shot run
 *   npm run test:watch # watch mode (rerun on file changes)
 *
 * Vitest is the testing framework; `@testing-library/react` provides
 * component rendering helpers; `jsdom` provides a browser-like DOM
 * environment for component tests.
 *
 * Install deps (one time):
 *   npm install --save-dev --legacy-peer-deps \
 *     vitest @vitest/ui @vitejs/plugin-react jsdom \
 *     @testing-library/react @testing-library/jest-dom @testing-library/user-event
 *
 * (--legacy-peer-deps is needed because React 19 RC + react-query don't
 *  agree on peer ranges; see frontend/CLAUDE.md.)
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.tsx"],
    include: ["**/*.test.{ts,tsx}", "**/__tests__/**/*.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
    ],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: [
        "node_modules/**",
        ".next/**",
        "**/*.config.{ts,js}",
        "**/*.d.ts",
        "**/types/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
