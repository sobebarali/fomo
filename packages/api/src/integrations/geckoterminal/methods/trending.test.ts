import { expect, it } from "vitest";
// fixture: REAL — captured from /networks/solana/trending_pools?include=base_token.
import trending from "../__fixtures__/trending.json";
import { jsonResponse, makeClient } from "../test-helpers";

it("normalizes trending pools to TokenSummary[] (price/mc/vol from the pool, metadata from included)", async () => {
  const { client } = makeClient(() => Promise.resolve(jsonResponse(trending)));

  const result = await client.trending({
    sort: "trending",
    limit: 10,
    offset: 0,
  });

  expect(result[0]).toMatchObject({
    address: "6jbx2PGZfXNaXxXSLzsUse5xQet3E5qnJqpMRso6pump",
    symbol: "Jetchua",
    name: "Jetchua",
    logoUri: "https://assets.geckoterminal.com/mt9qau802f3legzwev77bije51g4",
    change24h: -98.693,
    volume24h: 3_261_550.826_235_83,
    // market_cap_usd is null → falls back to fdv_usd.
    marketCap: 3518.231_722,
  });
  expect(result[0]?.priceUsd ?? 0).toBeGreaterThan(0);
  expect(result[0]?.priceUsd ?? 1).toBeLessThan(0.001);
});

it("honors the limit", async () => {
  const { client } = makeClient(() => Promise.resolve(jsonResponse(trending)));

  const result = await client.trending({
    sort: "trending",
    limit: 1,
    offset: 0,
  });

  expect(result).toHaveLength(1);
});
