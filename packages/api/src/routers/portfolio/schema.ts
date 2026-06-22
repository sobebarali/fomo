import { z } from "zod";
import { solanaMint } from "../_shared/schema";

export const positionInput = z.object({
  address: solanaMint,
});

const tokenBalance = z.object({
  address: z.string(),
  symbol: z.string(),
  logoUri: z.string().nullable(),
  amount: z.number(),
  priceUsd: z.number(),
  valueUsd: z.number(),
});

export const balancesOutput = z.object({
  solBalance: z.number(),
  tokens: z.array(tokenBalance),
  totalValueUsd: z.number(),
});

export const positionOutput = z.object({
  address: z.string(),
  amount: z.number(),
  valueUsd: z.number(),
  avgBuyUsd: z.number().nullable(),
  pnlUsd: z.number().nullable(),
  pnlPct: z.number().nullable(),
});
