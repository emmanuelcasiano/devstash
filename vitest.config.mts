import { defineConfig } from "vitest/config";

// Unit tests only — server actions and utility functions, not React components.
// No component-testing setup (jsdom, Testing Library) is installed, so the
// environment stays "node" and test files use the `.test.ts` extension
// (never `.test.tsx`) to keep component tests out of scope by convention.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
