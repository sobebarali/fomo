import { expect, it } from "vitest";
// fixture: REAL — captured via the birdeye MCP (`get-defi-token_trending`).
import trending from "../__fixtures__/trending.json";
import { jsonResponse, makeClient } from "../test-helpers";

it("normalizes the live trending payload to TokenSummary[]", async () => {
  const { client } = makeClient(() => Promise.resolve(jsonResponse(trending)));

  const result = await client.trending({
    sort: "trending",
    limit: 2,
    offset: 0,
  });

  expect(result).toHaveLength(2);
  // A thin token with null price/change normalizes to 0 (no fabricated market data).
  expect(result[0]).toEqual({
    address: "8hS74HdH6d6UTnnE7Vv25mJgboPeoxmM8S6DkW4Crise",
    symbol: "RISEPFT",
    name: "RisePFT",
    logoUri:
      "https://ipfs.io/ipfs/QmRV6TYJebN4cxHLLpkjTUVJ29cocPbCPPNPYat8GSUewY",
    priceUsd: 0,
    change24h: 0,
    volume24h: 0.084_415_317_342_354_87,
    marketCap: 0,
  });
  expect(result[1]).toMatchObject({
    symbol: "three",
    priceUsd: 0.004_454_815_540_754_624,
    change24h: 24.795_629_325_319_12,
    volume24h: 1_330_930.390_646_141_3,
    marketCap: 4_454_484.855_915_38,
  });
});
