import { UpstreamError } from "../../_shared/errors";
import { parseData } from "../../_shared/parse";
import type { JupiterContext } from "../context";
import { OrderResponse, type Quote } from "../schema";

const TTL = 5000;
const ORDER_PATH = "/swap/v2/order";

export interface QuoteInput {
  amount: string;
  inputMint: string;
  outputMint: string;
  slippageBps?: number;
}

/** `GET /swap/v2/order` without a `taker` → a quote only. Short TTL: quotes go stale fast. */
export function makeQuote(ctx: JupiterContext) {
  return ({
    inputMint,
    outputMint,
    amount,
    slippageBps,
  }: QuoteInput): Promise<Quote> =>
    ctx.cache.wrap(
      `quote:${inputMint}:${outputMint}:${amount}:${slippageBps}`,
      TTL,
      async () => {
        const raw = await ctx.request(ORDER_PATH, {
          inputMint,
          outputMint,
          amount,
          slippageBps,
        });
        return toQuote(parseData(OrderResponse, raw));
      }
    );
}

function toQuote(order: OrderResponse): Quote {
  if (order.errorCode != null || order.outAmount == null) {
    throw new UpstreamError("Jupiter returned no route for the quote");
  }
  return {
    inAmount: order.inAmount ?? "0",
    outAmount: order.outAmount,
    otherAmountThreshold: order.otherAmountThreshold ?? "0",
    priceImpactPct: Number(order.priceImpact ?? order.priceImpactPct ?? 0),
    slippageBps: order.slippageBps ?? 0,
    routePlan: (order.routePlan ?? []).map((step) => ({
      label: step.swapInfo?.label ?? "",
      percent: step.percent ?? 0,
    })),
  };
}
