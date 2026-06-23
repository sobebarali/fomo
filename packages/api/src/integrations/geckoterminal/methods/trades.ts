import { z } from "zod";
import type { Trade } from "../../../schemas/token";
import { parseData } from "../../_shared/parse";
import type { GeckoTerminalContext } from "../context";
import { resolvePool } from "./resolve-pool";

const TTL = 5000;

const TradesResponse = z.object({
  data: z.array(
    z.object({
      attributes: z.object({
        block_timestamp: z.string(),
        kind: z.enum(["buy", "sell"]).nullish(),
        price_from_in_usd: z.string().nullish(),
        price_to_in_usd: z.string().nullish(),
        from_token_amount: z.string().nullish(),
        to_token_amount: z.string().nullish(),
        tx_hash: z.string(),
        tx_from_address: z.string().nullish(),
      }),
    })
  ),
});

type TradeAttrs = z.infer<typeof TradesResponse>["data"][number]["attributes"];

// `kind` is relative to the pool's base token: a buy receives the base (the `to` side), a sell sends
// it (the `from` side) — so the token's price + amount come from the matching side.
function toTrade(attrs: TradeAttrs): Trade {
  const side = attrs.kind ?? "buy";
  const isBuy = side === "buy";
  return {
    txHash: attrs.tx_hash,
    blockUnixTime: Math.floor(Date.parse(attrs.block_timestamp) / 1000),
    side,
    owner: attrs.tx_from_address ?? "",
    priceUsd:
      Number(isBuy ? attrs.price_to_in_usd : attrs.price_from_in_usd) || 0,
    amount:
      Number(isBuy ? attrs.to_token_amount : attrs.from_token_amount) || 0,
  };
}

export interface TradesInput {
  address: string;
  limit: number;
}

export function makeTrades(ctx: GeckoTerminalContext) {
  return ({ address, limit }: TradesInput): Promise<Trade[]> =>
    ctx.cache.wrap(`trades:${address}:${limit}`, TTL, async () => {
      const pool = await resolvePool(ctx, address);
      if (!pool) {
        return [];
      }
      const body = await ctx.request(`/networks/solana/pools/${pool}/trades`);
      return parseData(TradesResponse, body)
        .data.map((entry) => toTrade(entry.attributes))
        .slice(0, limit);
    });
}
