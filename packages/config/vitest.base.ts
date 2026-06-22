import { defineConfig, mergeConfig, type ViteUserConfig } from "vitest/config";

/**
 * Shared Vitest defaults for every workspace.
 *
 * Each package's `vitest.config.ts` calls this. Pass `pg: true` for packages whose
 * integration tests spin a PGlite database (see `@fomo/db/testing`'s `createTestDb`) —
 * pushing the Drizzle schema + many round-trips can exceed Vitest's 5s default, so we
 * raise the timeout. Any other key is a Vite/Vitest override, deep-merged on top.
 */
export function defineVitestConfig({
  pg = false,
  ...overrides
}: { pg?: boolean } & ViteUserConfig = {}): ViteUserConfig {
  const base = defineConfig({
    test: {
      globals: true,
      environment: "node",
      clearMocks: true,
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
      passWithNoTests: true,
      ...(pg ? { testTimeout: 20_000 } : {}),
    },
  });

  return mergeConfig(base, overrides);
}
