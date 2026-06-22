import { z } from "zod";
import { UpstreamError } from "../../_shared/errors";
import { parseData } from "../../_shared/parse";
import type { BirdEyeContext } from "../context";
import type { Candle } from "../schema";

const TTL = 300_000;

const OhlcvData = z.object({
  items: z.array(
    z.object({
      unixTime: z.number(),
      o: z.number(),
      h: z.number(),
      l: z.number(),
      c: z.number(),
      v: z.number(),
    })
  ),
});

function toCandles(raw: z.infer<typeof OhlcvData>): Candle[] {
  return raw.items.map((item) => ({
    time: item.unixTime,
    open: item.o,
    high: item.h,
    low: item.l,
    close: item.c,
    volume: item.v,
  }));
}

export interface OhlcvInput {
  address: string;
  from: number;
  interval: string;
  to: number;
}

export function makeOhlcv(ctx: BirdEyeContext) {
  return ({ address, interval, from, to }: OhlcvInput): Promise<Candle[]> =>
    ctx.cache.wrap(
      `ohlcv:${address}:${interval}:${from}:${to}`,
      TTL,
      async () => {
        const { success, data } = await ctx.request("/defi/ohlcv", {
          address,
          type: interval,
          time_from: from,
          time_to: to,
        });
        if (!success) {
          throw new UpstreamError("BirdEye reported failure");
        }
        return toCandles(parseData(OhlcvData, data));
      }
    );
}
