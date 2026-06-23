import { expect, it } from "vitest";
// fixtures: REAL — captured from the live GeckoTerminal API.
import pools from "../__fixtures__/pools.json";
import trades from "../__fixtures__/trades.json";
import { jsonResponse, makeClient } from "../test-helpers";

const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";

function route(url: string | URL): Response {
  const u = String(url);
  if (u.includes("/trades")) {
    return jsonResponse(trades);
  }
  if (u.includes("/ohlcv/")) {
    return jsonResponse({ data: { attributes: { ohlcv_list: [] } } });
  }
  return jsonResponse(pools);
}

it("maps a sell (from-side) and a buy (to-side) to the Trade view type", async () => {
  const { client } = makeClient((url) => Promise.resolve(route(url)));

  const result = await client.trades({ address: BONK, limit: 30 });

  // Fixture trade[0] is a sell → price/amount from the `from` side.
  const sell = result[0];
  expect(sell?.side).toBe("sell");
  expect(sell?.txHash).toBe(
    "55HLTGCpwUdfejoS4kC5M5QTK71g6yuVXnfoCvdJYAzwCKQ1dM7tn8PReXzfMHtPzvpkC93XbjjwsmQzV1D5AFNa"
  );
  expect(sell?.owner).toBe("MfDuWeqSHEqTFVYZ7LoexgAK9dxk7cy4DFJWjWMGVWa");
  expect(sell?.blockUnixTime).toBe(
    Math.floor(Date.parse("2026-06-23T07:59:03Z") / 1000)
  );
  expect(sell?.priceUsd ?? 0).toBeCloseTo(0.000_004_424_5, 9);
  expect(sell?.amount ?? 0).toBeCloseTo(85_474_968.198_57, 2);

  // Fixture trade[1] is a buy → price/amount from the `to` side.
  const buy = result[1];
  expect(buy?.side).toBe("buy");
  expect(buy?.owner).toBe("G6zuVp79eBixXFKtzjWN8zCdeKoYTscG5pysbJrFRAAe");
  expect(buy?.amount ?? 0).toBeCloseTo(9489.201_43, 2);
  expect(buy?.priceUsd ?? 0).toBeCloseTo(0.000_004_427_2, 9);
});

it("does not re-resolve the pool across ohlcv + trades (cached resolve)", async () => {
  const { client, fetchMock } = makeClient((url) =>
    Promise.resolve(route(url))
  );

  await client.trades({ address: BONK, limit: 5 });
  await client.ohlcv({ address: BONK, interval: "1H", from: 0, to: 1 });

  const poolResolves = fetchMock.mock.calls
    .map((call) => String(call[0]))
    .filter((u) => u.includes(`/tokens/${BONK}/pools`));
  expect(poolResolves).toHaveLength(1);
});
