import { ORPCError } from "@orpc/server";
import { publicProcedure } from "../../index";
import {
  RateLimitError,
  UpstreamError,
} from "../../integrations/_shared/errors";
import { market } from "../../integrations/market";
import { recentInput, recentOutput } from "./schema";

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

const recent = publicProcedure
  .errors({ BAD_REQUEST: {}, RATE_LIMITED: {}, UPSTREAM_ERROR: {} })
  .input(recentInput)
  .output(recentOutput)
  .handler(async ({ input }) => {
    try {
      // Newest-first already (the integration requests sort_type=desc); the map preserves order.
      // ponytail: trust integration's sort_type=desc; re-sort here only if the contract ever needs ordering independent of upstream.
      const trades = await market.trades({
        address: input.address,
        limit: input.limit,
      });
      return {
        items: trades.map((t) => ({
          txHash: t.txHash,
          side: t.side,
          priceUsd: t.priceUsd,
          amountToken: t.amount,
          amountUsd: t.amount * t.priceUsd,
          trader: t.owner,
          time: t.blockUnixTime,
        })),
      };
    } catch (err) {
      mapUpstreamError(err);
    }
  });

export const tradesRouter = { recent };
