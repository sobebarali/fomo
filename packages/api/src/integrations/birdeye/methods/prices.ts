import { z } from "zod";
import { parseData } from "../../_shared/parse";
import type { BirdEyeContext } from "../context";

const TTL = 5000;

const PriceData = z.object({ value: z.number().nullish() });

export interface PricesInput {
  addresses: string[];
}

// `/defi/multi_price` is plan-gated (401 on this key), so price each address via the accessible
// `/defi/price` endpoint and cache per address — better reuse across portfolio refreshes.
export function makePrices(ctx: BirdEyeContext) {
  return async ({
    addresses,
  }: PricesInput): Promise<Record<string, number>> => {
    const entries = await Promise.all(
      addresses.map((address) =>
        ctx.cache
          .wrap(`price:${address}`, TTL, async () => {
            const { success, data } = await ctx.request("/defi/price", {
              address,
            });
            if (!success || data == null) {
              return null;
            }
            return parseData(PriceData, data).value ?? null;
          })
          .then((value) => [address, value] as const)
      )
    );

    const out: Record<string, number> = {};
    for (const [address, value] of entries) {
      if (value != null) {
        out[address] = value;
      }
    }
    return out;
  };
}
