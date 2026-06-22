import { expect, it } from "vitest";
// fixture: REAL — captured from the live BirdEye API (/defi/v3/token/holder).
import holder from "../__fixtures__/holder.json";
import { jsonResponse, makeClient } from "../test-helpers";

it("normalizes v3 holders to address + amount", async () => {
  const { client } = makeClient(() => Promise.resolve(jsonResponse(holder)));

  const result = await client.holders({
    address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    limit: 3,
  });

  expect(result).toEqual([
    {
      address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      amount: 6_996_666_051_223.375,
    },
    {
      address: "51yZyDSnec4xnUv7XLRVYcDyV4x3wUtzrDcRaYbmQU5j",
      amount: 4_712_047_669_409.045,
    },
    {
      address: "AGkGWK1R669KDT4FCqgDgK7PgahGJPjD4J9xmVjuL9kn",
      amount: 4_426_104_450_305.966,
    },
  ]);
});
