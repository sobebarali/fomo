import { z } from "zod";
import type { Candle } from "../../../schemas/token";
import { parseData } from "../../_shared/parse";
import type { GeckoTerminalContext } from "../context";
import { resolvePool } from "./resolve-pool";

const TTL = 300_000;
const DEFAULT_LIMIT = 1000; // GeckoTerminal's max candles per request.

// Router interval → GeckoTerminal (timeframe, aggregate).
const TIMEFRAME: Record<string, { aggregate: number; timeframe: string }> = {
  "1m": { timeframe: "minute", aggregate: 1 },
  "5m": { timeframe: "minute", aggregate: 5 },
  "15m": { timeframe: "minute", aggregate: 15 },
  "1H": { timeframe: "hour", aggregate: 1 },
  "4H": { timeframe: "hour", aggregate: 4 },
  "1D": { timeframe: "day", aggregate: 1 },
  "1W": { timeframe: "day", aggregate: 7 },
};
const FALLBACK_TIMEFRAME = { timeframe: "minute", aggregate: 15 };

// ohlcv_list rows are [timestamp, open, high, low, close, volume].
const OhlcvResponse = z.object({
  data: z.object({
    attributes: z.object({
      ohlcv_list: z.array(
        z.tuple([
          z.number(),
          z.number(),
          z.number(),
          z.number(),
          z.number(),
          z.number(),
        ])
      ),
    }),
  }),
});

function toCandles(raw: z.infer<typeof OhlcvResponse>): Candle[] {
  return raw.data.attributes.ohlcv_list.map(
    ([time, open, high, low, close, volume]) => ({
      time,
      open,
      high,
      low,
      close,
      volume,
    })
  );
}

export interface OhlcvInput {
  address: string;
  from: number;
  interval: string;
  to: number;
}

export function makeOhlcv(ctx: GeckoTerminalContext) {
  return ({ address, interval, from, to }: OhlcvInput): Promise<Candle[]> =>
    ctx.cache.wrap(
      `ohlcv:${address}:${interval}:${from}:${to}`,
      TTL,
      async () => {
        const pool = await resolvePool(ctx, address);
        if (!pool) {
          // No pool → empty series → router maps NOT_FOUND.
          return [];
        }
        const tf = TIMEFRAME[interval] ?? FALLBACK_TIMEFRAME;
        const body = await ctx.request(
          `/networks/solana/pools/${pool}/ohlcv/${tf.timeframe}`,
          {
            aggregate: tf.aggregate,
            before_timestamp: to,
            limit: DEFAULT_LIMIT,
            currency: "usd",
          }
        );
        return toCandles(parseData(OhlcvResponse, body));
      }
    );
}
