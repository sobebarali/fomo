import { defineVitestConfig } from "@fomo/config/vitest.base";

export default defineVitestConfig({
  pg: true,
  test: {
    // Router handlers run against an injected PGlite db, but importing `@fomo/db` /
    // `@fomo/env` still validates server env at module load — provide harmless test values
    // (the dummy DATABASE_URL is never connected to; tests use the PGlite db on context).
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      CORS_ORIGIN: "http://localhost:3001",
      BIRDEYE_API_KEY: "test",
      ALCHEMY_RPC_URL: "http://localhost",
      JUPITER_API_KEY: "test",
      PRIVY_APP_SECRET: "test",
      NEXT_PUBLIC_PRIVY_APP_ID: "test",
    },
  },
});
