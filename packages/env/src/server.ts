import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    CORS_ORIGIN: z.url(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    BIRDEYE_API_KEY: z.string().min(1),
    ALCHEMY_RPC_URL: z.url(),
    JUPITER_API_KEY: z.string().min(1),
    PRIVY_APP_SECRET: z.string().min(1),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
    UPSTASH_REDIS_REST_URL: z.url(),
    // Keyless free market-data sources — optional base-URL overrides (default to the public hosts).
    DEXSCREENER_BASE_URL: z.url().optional(),
    GECKOTERMINAL_BASE_URL: z.url().optional(),
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
