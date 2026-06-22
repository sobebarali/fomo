import { z } from "zod";
import { UpstreamError } from "../../_shared/errors";
import { parseData } from "../../_shared/parse";
import type { BirdEyeContext } from "../context";
import type { Trade } from "../schema";

const TTL = 5000;

// txs/token: `base` is always the queried token (`quote` the counter-asset). The token's USD price is
// `basePrice` and the traded amount is `base.uiAmount` — there is no flat `volumeUSD` field.
const TradeData = z.object({
  items: z.array(
    z.object({
      txHash: z.string(),
      blockUnixTime: z.number(),
      side: z.enum(["buy", "sell"]).nullish(),
      owner: z.string().nullish(),
      basePrice: z.number().nullish(),
      base: z.object({ uiAmount: z.number().nullish() }).nullish(),
    })
  ),
});

function toTrades(raw: z.infer<typeof TradeData>): Trade[] {
  return raw.items.map((item) => ({
    txHash: item.txHash,
    blockUnixTime: item.blockUnixTime,
    side: item.side ?? "buy",
    owner: item.owner ?? "",
    priceUsd: item.basePrice ?? 0,
    amount: item.base?.uiAmount ?? 0,
  }));
}

export interface TradesInput {
  address: string;
  limit: number;
}

export function makeTrades(ctx: BirdEyeContext) {
  return ({ address, limit }: TradesInput): Promise<Trade[]> =>
    ctx.cache.wrap(`trades:${address}:${limit}`, TTL, async () => {
      const { success, data } = await ctx.request("/defi/txs/token", {
        address,
        offset: 0,
        limit,
        tx_type: "swap",
        sort_type: "desc",
      });
      if (!success) {
        throw new UpstreamError("BirdEye reported failure");
      }
      return toTrades(parseData(TradeData, data));
    });
}
