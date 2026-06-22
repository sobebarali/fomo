import { expect, it } from "vitest";
// fixture: REAL — captured from the live BirdEye API (/defi/ohlcv).
import ohlcv from "../__fixtures__/ohlcv.json";
import { jsonResponse, makeClient } from "../test-helpers";

it("normalizes ohlcv items to Candle[]", async () => {
  const { client } = makeClient(() => Promise.resolve(jsonResponse(ohlcv)));

  const result = await client.ohlcv({
    address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    interval: "15m",
    from: 1_782_117_010,
    to: 1_782_124_210,
  });

  expect(result).toHaveLength(3);
  expect(result[0]).toEqual({
    time: 1_782_117_900,
    open: 0.000_004_618_866_595_389_793,
    high: 0.000_004_629_967_710_803_294,
    low: 0.000_004_606_437_497_006_688,
    close: 0.000_004_614_105_515_533_218_5,
    volume: 1_291_266_269.597_211_1,
  });
});
