import { z } from "zod";

const Link = z.object({
  label: z.string().nullish(),
  type: z.string().nullish(),
  url: z.string(),
});

/** One trading pair from `/tokens/v1/solana/{address}`. Only the fields we map are modeled. */
export const Pair = z.object({
  baseToken: z.object({
    address: z.string(),
    name: z.string().nullish(),
    symbol: z.string().nullish(),
  }),
  priceUsd: z.string().nullish(),
  priceChange: z.object({ h24: z.number().nullish() }).nullish(),
  volume: z.object({ h24: z.number().nullish() }).nullish(),
  liquidity: z.object({ usd: z.number().nullish() }).nullish(),
  fdv: z.number().nullish(),
  marketCap: z.number().nullish(),
  info: z
    .object({
      imageUrl: z.string().nullish(),
      websites: z.array(Link).nullish(),
      socials: z.array(Link).nullish(),
    })
    .nullish(),
});

export type Pair = z.infer<typeof Pair>;

/** `/tokens/v1/solana/{address}` returns a bare array of pairs (no envelope). */
export const TokensResponse = z.array(Pair);
