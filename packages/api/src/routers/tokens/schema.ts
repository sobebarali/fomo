import { z } from "zod";

import { solanaMint } from "../_shared/schema";

/**
 * Named inputs + output views for the `tokens` router. Output schemas mirror the integration's view
 * types (`TokenSummary`/`TokenDetail` from `../../integrations/birdeye`): the handlers return those
 * typed values into `.output(...)`, so a renamed/added BirdEye field fails `check-types`, and a dropped
 * field fails the full-shape happy-path test — no shape drift slips through.
 */

export const trendingInput = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
  sort: z.enum(["trending", "gainers", "new"]).default("trending"),
});

export const getInput = z.object({
  address: solanaMint,
});

export const tokenSummary = z.object({
  address: z.string(),
  symbol: z.string(),
  name: z.string(),
  logoUri: z.string().nullable(),
  priceUsd: z.number(),
  change24h: z.number(),
  volume24h: z.number(),
  marketCap: z.number(),
});

export const tokenDetail = tokenSummary.extend({
  liquidity: z.number(),
  holders: z.number(),
  totalSupply: z.number(),
  description: z.string().nullable(),
  links: z.object({
    website: z.string().optional(),
    twitter: z.string().optional(),
  }),
});

export const trendingOutput = z.object({
  items: z.array(tokenSummary),
  nextCursor: z.string().nullable(),
});
