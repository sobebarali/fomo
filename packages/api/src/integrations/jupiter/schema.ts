import { z } from "zod";

export interface RoutePlanStep {
  label: string;
  percent: number;
}

/** Quote view returned to `swap.quote`. `inAmount`/`outAmount`/`otherAmountThreshold` are base-unit
 *  **strings**, passed through untouched (a JS-number round-trip corrupts large token amounts). */
export interface Quote {
  inAmount: string;
  otherAmountThreshold: string;
  outAmount: string;
  priceImpactPct: number;
  routePlan: RoutePlanStep[];
  slippageBps: number;
}

/** Build result returned to `swap.buildTransaction` — a base64 **unsigned** tx plus the `requestId`
 *  the swap router later hands to `POST /swap/v2/execute`. */
export interface SwapTxResult {
  requestId: string;
  swapTransaction: string;
}

const RoutePlanEntry = z.object({
  swapInfo: z.object({ label: z.string().nullish() }).nullish(),
  percent: z.number().nullish(),
});

/** Raw `GET /swap/v2/order` payload — lenient, since Jupiter fields are nullish. Both methods parse
 *  it: without `taker` it's a quote; with `taker` it also carries an unsigned `transaction` +
 *  `requestId`. A no-route result comes back as `errorCode`/`errorMessage` with no `outAmount`/`transaction`. */
export const OrderResponse = z.object({
  inAmount: z.string().nullish(),
  outAmount: z.string().nullish(),
  otherAmountThreshold: z.string().nullish(),
  priceImpact: z.union([z.number(), z.string()]).nullish(),
  priceImpactPct: z.string().nullish(),
  slippageBps: z.number().nullish(),
  routePlan: z.array(RoutePlanEntry).nullish(),
  transaction: z.string().nullish(),
  requestId: z.string().nullish(),
  errorCode: z.union([z.string(), z.number()]).nullish(),
  errorMessage: z.string().nullish(),
});
export type OrderResponse = z.infer<typeof OrderResponse>;
