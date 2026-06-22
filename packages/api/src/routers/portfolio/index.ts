import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../../index";
import {
  RateLimitError,
  UpstreamError,
} from "../../integrations/_shared/errors";
import { alchemy } from "../../integrations/alchemy";
import { birdeye } from "../../integrations/birdeye";
import { balancesOutput, positionInput, positionOutput } from "./schema";

const WSOL = "So11111111111111111111111111111111111111112";

// One upstream failure → one taxonomy code: 429 → RATE_LIMITED, anything else → UPSTREAM_ERROR.
// Re-throws anything not from the integration, so our own ORPCErrors pass through untouched.
function mapUpstreamError(err: unknown): never {
  if (err instanceof RateLimitError) {
    throw new ORPCError("RATE_LIMITED");
  }
  if (err instanceof UpstreamError) {
    throw new ORPCError("UPSTREAM_ERROR");
  }
  throw err;
}

const balances = protectedProcedure
  .errors({ RATE_LIMITED: {}, UNAUTHORIZED: {}, UPSTREAM_ERROR: {} })
  .output(balancesOutput)
  .handler(async ({ context }) => {
    const wallet = context.auth.walletAddress;
    if (!wallet) {
      // Degraded session or no embedded wallet: this procedure cannot read a portfolio.
      throw new ORPCError("UNAUTHORIZED");
    }

    try {
      const [solBalance, rawTokens] = await Promise.all([
        alchemy.getSolBalance(wallet),
        alchemy.getTokenBalances(wallet),
      ]);
      const held = rawTokens.filter((token) => token.amount > 0);
      // One token-detail call per held mint; the integration owns caching/rate-limits, and batching
      // stays deferred until the paid multi-price path is worth exposing.
      const [wsol, ...details] = await Promise.all([
        birdeye.token({ address: WSOL }),
        ...held.map((token) => birdeye.token({ address: token.address })),
      ]);

      const tokens = held.flatMap((token, index) => {
        const detail = details[index];
        if (!detail) {
          return [];
        }

        return {
          address: token.address,
          symbol: detail.symbol,
          logoUri: detail.logoUri,
          amount: token.amount,
          priceUsd: detail.priceUsd,
          valueUsd: token.amount * detail.priceUsd,
        };
      });
      const solValue = solBalance * (wsol?.priceUsd ?? 0);
      const tokenValue = tokens.reduce((sum, token) => sum + token.valueUsd, 0);

      return { solBalance, tokens, totalValueUsd: solValue + tokenValue };
    } catch (err) {
      mapUpstreamError(err);
    }
  });

const position = protectedProcedure
  .errors({
    BAD_REQUEST: {},
    NOT_FOUND: {},
    RATE_LIMITED: {},
    UNAUTHORIZED: {},
    UPSTREAM_ERROR: {},
  })
  .input(positionInput)
  .output(positionOutput)
  .handler(async ({ context, input }) => {
    const wallet = context.auth.walletAddress;
    if (!wallet) {
      // Degraded session or no embedded wallet: this procedure cannot read a portfolio.
      throw new ORPCError("UNAUTHORIZED");
    }

    try {
      const tokens = await alchemy.getTokenBalances(wallet);
      const held = tokens.find(
        (token) => token.address === input.address && token.amount > 0
      );
      if (!held) {
        throw new ORPCError("NOT_FOUND");
      }

      const detail = await birdeye.token({ address: input.address });
      const priceUsd = detail?.priceUsd ?? 0;

      return {
        address: input.address,
        amount: held.amount,
        valueUsd: held.amount * priceUsd,
        // Cost basis needs a persisted trade-history table; until then P/L is unknown, not guessed.
        avgBuyUsd: null,
        pnlUsd: null,
        pnlPct: null,
      };
    } catch (err) {
      mapUpstreamError(err);
    }
  });

export const portfolioRouter = { balances, position };
