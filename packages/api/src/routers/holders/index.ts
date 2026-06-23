import { ORPCError } from "@orpc/server";
import { publicProcedure } from "../../index";
import {
  RateLimitError,
  UpstreamError,
} from "../../integrations/_shared/errors";
import { market } from "../../integrations/market";
import { listInput, listOutput } from "./schema";

// One upstream failure → one taxonomy code: 429 → RATE_LIMITED, anything else → UPSTREAM_ERROR.
// Re-throws anything not from the integration, never leaking a raw 500.
function mapUpstreamError(err: unknown): never {
  if (err instanceof RateLimitError) {
    throw new ORPCError("RATE_LIMITED");
  }
  if (err instanceof UpstreamError) {
    throw new ORPCError("UPSTREAM_ERROR");
  }
  throw err;
}

// Percent of circulating supply, 2 decimals (one rounding rule so the UI shows a consistent %).
function percentOfSupply(amount: number, supply: number): number {
  return supply > 0 ? Math.round((amount / supply) * 10_000) / 100 : 0;
}

const list = publicProcedure
  .errors({ BAD_REQUEST: {}, RATE_LIMITED: {}, UPSTREAM_ERROR: {} })
  .input(listInput)
  .output(listOutput)
  .handler(async ({ input }) => {
    try {
      // `holders` has no supply; `token` carries totalSupply. Both are cached in the integration —
      // on the trading page the detail is usually already warm, so the 2nd call is a cache hit.
      const [holders, token] = await Promise.all([
        market.holders({ address: input.address, limit: input.limit }),
        market.token({ address: input.address }),
      ]);
      const supply = token?.totalSupply ?? 0;
      // Sort defensively (don't trust upstream order) so `rank` is authoritative.
      const items = [...holders]
        .sort((a, b) => b.amount - a.amount)
        .map((h, i) => ({
          owner: h.address,
          amount: h.amount,
          percentage: percentOfSupply(h.amount, supply),
          rank: i + 1,
        }));
      return { items };
    } catch (err) {
      mapUpstreamError(err);
    }
  });

export const holdersRouter = { list };
