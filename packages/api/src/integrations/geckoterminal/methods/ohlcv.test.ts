import { expect, it } from "vitest";
// fixtures: REAL — captured from the live GeckoTerminal API.
import ohlcv from "../__fixtures__/ohlcv.json";
import pools from "../__fixtures__/pools.json";
import { jsonResponse, makeClient } from "../test-helpers";

const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const TOP_POOL = "6oFWm7KPLfxnwMb3z5xwBoXNSPP3JJyirAPqPSiVcnsp";

// Route the resolve-pool call vs the ohlcv/trades call by URL.
function route(url: string | URL): Response {
  const u = String(url);
  if (u.includes("/ohlcv/")) {
    return jsonResponse(ohlcv);
  }
  if (u.includes("/trades")) {
    return jsonResponse([]);
  }
  return jsonResponse(pools); // /tokens/{addr}/pools
}

it("resolves the highest-reserve base pool and maps ohlcv_list to ascending Candle[]", async () => {
  const { client, fetchMock } = makeClient((url) =>
    Promise.resolve(route(url))
  );

  const candles = await client.ohlcv({
    address: BONK,
    interval: "15m",
    from: 0,
    to: 1_782_200_700,
  });

  // First fixture row: [1782200700, o, h, l, c, v].
  expect(candles[0]).toEqual({
    time: 1_782_200_700,
    open: 0.000_004_447_462_221_045_172_5,
    high: 0.000_004_447_462_221_045_172_5,
    low: 0.000_004_430_240_825_892_527,
    close: 0.000_004_430_240_825_892_527,
    volume: 836.824_591_905_721_7,
  });
  expect(candles).toHaveLength(3);

  // Picked the highest-reserve pool and mapped 15m → minute/aggregate=15.
  const ohlcvUrl = fetchMock.mock.calls
    .map((call) => String(call[0]))
    .find((u) => u.includes("/ohlcv/"));
  expect(ohlcvUrl).toContain(`/pools/${TOP_POOL}/ohlcv/minute`);
  expect(ohlcvUrl).toContain("aggregate=15");
  expect(ohlcvUrl).toContain("limit=1000");
});

it("sizes short-window ohlcv requests to the requested candle count", async () => {
  const { client, fetchMock } = makeClient((url) =>
    Promise.resolve(route(url))
  );

  await client.ohlcv({
    address: BONK,
    interval: "15m",
    from: 1_782_114_300,
    to: 1_782_200_700,
  });

  const ohlcvUrl = fetchMock.mock.calls
    .map((call) => String(call[0]))
    .find((u) => u.includes("/ohlcv/"));
  expect(ohlcvUrl).toContain("limit=97");
});

it("returns an empty series when the token has no pool", async () => {
  const { client } = makeClient(() =>
    Promise.resolve(jsonResponse({ data: [] }))
  );

  expect(
    await client.ohlcv({ address: BONK, interval: "15m", from: 0, to: 1 })
  ).toEqual([]);
});
