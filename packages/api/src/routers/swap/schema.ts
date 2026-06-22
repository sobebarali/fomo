import { z } from "zod";

import { solanaMint } from "../_shared/schema";

const baseUnitAmount = z
  .string()
  .regex(/^[1-9]\d*$/, "Amount must be a positive base-unit integer string");

const solanaAddress = z
  .string()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Invalid Solana address");

const swapParams = z.object({
  amount: baseUnitAmount,
  inputMint: solanaMint,
  outputMint: solanaMint,
  slippageBps: z.number().int().min(1).max(5000).default(50),
});

export const quoteInput = swapParams;

export const buildTransactionInput = swapParams.extend({
  userPublicKey: solanaAddress,
});

export const routePlanStep = z.object({
  label: z.string(),
  percent: z.number(),
});

export const quoteOutput = z.object({
  inAmount: z.string(),
  outAmount: z.string(),
  otherAmountThreshold: z.string(),
  priceImpactPct: z.number(),
  routePlan: z.array(routePlanStep),
  slippageBps: z.number(),
});

export const buildTransactionOutput = z.object({
  swapTransaction: z.string(),
});
