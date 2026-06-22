import { expect, it } from "vitest";
// fixture: REAL — captured from the live BirdEye API (/defi/txs/token).
import txs from "../__fixtures__/txs.json";
import { jsonResponse, makeClient } from "../test-helpers";

it("normalizes txs/token items to Trade[] (base price + base amount)", async () => {
  const { client } = makeClient(() => Promise.resolve(jsonResponse(txs)));

  const result = await client.trades({
    address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    limit: 2,
  });

  expect(result[0]).toEqual({
    txHash:
      "38jKBu2jo8ZHDBYee3FCfESNMCTnvoAZngW1gD1M9q564ym26ehaoSVzTBXVYbsNuZQnhaHEUbum94cmp1TEVhx7",
    blockUnixTime: 1_782_126_032,
    side: "buy",
    owner: "5EmCggJRHp59A4uNLBRKiGW6DpCmxZDSshjhx8ZpsJXe",
    priceUsd: 0.000_004_621_445_672_634_578,
    amount: 21_394.645_22,
  });
  expect(result[1]).toMatchObject({
    side: "sell",
    amount: 1506.693_69,
    priceUsd: 0.000_004_621_445_672_634_578,
  });
});
