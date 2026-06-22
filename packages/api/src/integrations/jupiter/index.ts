import { createContext, type JupiterClientOptions } from "./context";
import { makeQuote, type QuoteInput } from "./methods/quote";
import {
  makeSwapTransaction,
  type SwapTransactionInput,
} from "./methods/swap-transaction";
import type { Quote, SwapTxResult } from "./schema";

export interface JupiterClient {
  quote(input: QuoteInput): Promise<Quote>;
  swapTransaction(input: SwapTransactionInput): Promise<SwapTxResult>;
}

/** Assemble the client — one shared context (cache + rate-limiter) wired into every method. */
export function createJupiterClient(
  options?: JupiterClientOptions
): JupiterClient {
  const ctx = createContext(options);
  return {
    quote: makeQuote(ctx),
    swapTransaction: makeSwapTransaction(ctx),
  };
}

/** The single shared instance routers import — one cache, one rate-limiter, key from env. */
export const jupiter = createJupiterClient();
