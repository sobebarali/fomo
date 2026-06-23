import { ORPCError } from "@orpc/server";
import { publicProcedure } from "../../index";
import {
  RateLimitError,
  UpstreamError,
} from "../../integrations/_shared/errors";
import { market } from "../../integrations/market";
import { candlesInput, candlesOutput } from "./schema";

// Default range when from/to omitted: ~300 candles back from now, scaled per interval.
const INTERVAL_SECONDS = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1H": 3600,
  "4H": 14_400,
  "1D": 86_400,
  "1W": 604_800,
} as const satisfies Record<string, number>;
const DEFAULT_CANDLES = 300;

// One upstream failure → one taxonomy code: 429 → RATE_LIMITED, anything else → UPSTREAM_ERROR.
// Re-throws anything not from the integration (e.g. a NOT_FOUND we raised), never leaking a raw 500.
function mapUpstreamError(err: unknown): never {
  if (err instanceof RateLimitError) {
    throw new ORPCError("RATE_LIMITED");
  }
  if (err instanceof UpstreamError) {
    throw new ORPCError("UPSTREAM_ERROR");
  }
  throw err;
}

const candles = publicProcedure
  .errors({
    BAD_REQUEST: {},
    NOT_FOUND: {},
    RATE_LIMITED: {},
    UPSTREAM_ERROR: {},
  })
  .input(candlesInput)
  .output(candlesOutput)
  .handler(async ({ input }) => {
    const to = input.to ?? Math.floor(Date.now() / 1000);
    const from =
      input.from ?? to - INTERVAL_SECONDS[input.interval] * DEFAULT_CANDLES;
    if (from > to) {
      throw new ORPCError("BAD_REQUEST");
    }
    try {
      const series = await market.ohlcv({
        address: input.address,
        interval: input.interval,
        from,
        to,
      });
      if (series.length === 0) {
        throw new ORPCError("NOT_FOUND");
      }
      const sorted = [...series].sort((a, b) => a.time - b.time);
      return { candles: sorted };
    } catch (err) {
      mapUpstreamError(err);
    }
  });

export const chartRouter = { candles };
