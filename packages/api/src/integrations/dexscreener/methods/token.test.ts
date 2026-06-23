import { expect, it } from "vitest";
// fixture: REAL — captured from https://api.dexscreener.com/tokens/v1/solana/{BONK}.
import token from "../__fixtures__/token.json";
import { jsonResponse, makeClient } from "../test-helpers";

const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";

it("normalizes the live token payload to TokenDetail", async () => {
  const { client } = makeClient(() => Promise.resolve(jsonResponse(token)));

  const result = await client.token({ address: BONK });

  expect(result).toEqual({
    address: BONK,
    symbol: "Bonk",
    name: "Bonk",
    logoUri:
      "https://cdn.dexscreener.com/cms/images/ba03c0370670d176dc33bbd212eb023337a460ad7edfa053ca96ae22f31c3dcf?width=800&height=800&quality=95&format=auto",
    priceUsd: 0.000_004_437,
    change24h: -4.18,
    volume24h: 918_256.5,
    marketCap: 390_450_566,
    liquidity: 320_481.1,
    holders: 0,
    totalSupply: 0,
    description: null,
    links: {
      website: "https://www.bonkcoin.com",
      twitter: "https://twitter.com/bonk_inu",
    },
  });
});

it("picks the highest-liquidity pair where the mint is the base token", async () => {
  const pairs = [
    {
      baseToken: { address: BONK, name: "Bonk", symbol: "Bonk" },
      priceUsd: "1.0",
      liquidity: { usd: 100 },
    },
    {
      baseToken: { address: BONK, name: "Bonk", symbol: "Bonk" },
      priceUsd: "2.0",
      liquidity: { usd: 9000 },
    },
  ];
  const { client } = makeClient(() => Promise.resolve(jsonResponse(pairs)));

  const result = await client.token({ address: BONK });

  expect(result?.priceUsd).toBe(2.0);
  expect(result?.liquidity).toBe(9000);
});

it("returns null when no pair has the mint as base token", async () => {
  const onlyAsQuote = [
    {
      baseToken: { address: "OtherMint", name: "Other", symbol: "OTH" },
      priceUsd: "5.0",
      liquidity: { usd: 5000 },
    },
  ];
  const { client } = makeClient(() =>
    Promise.resolve(jsonResponse(onlyAsQuote))
  );

  expect(await client.token({ address: BONK })).toBeNull();
});

it("returns null for an empty array (unknown mint)", async () => {
  const { client } = makeClient(() => Promise.resolve(jsonResponse([])));

  expect(await client.token({ address: BONK })).toBeNull();
});
