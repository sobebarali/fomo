import { expect, it } from "vitest";
// fixture: REAL — captured from the live BirdEye API (/defi/price).
import price from "../__fixtures__/price.json";
import { jsonResponse, makeClient } from "../test-helpers";

it("maps each address to its /defi/price value", async () => {
  const { client } = makeClient(() => Promise.resolve(jsonResponse(price)));

  const result = await client.prices({
    addresses: ["So11111111111111111111111111111111111111112"],
  });

  expect(result).toEqual({
    So11111111111111111111111111111111111111112: 73.631_698_493_645_59,
  });
});

it("skips an address whose price is unavailable", async () => {
  const { client } = makeClient(() =>
    Promise.resolve(jsonResponse({ success: true, data: null }))
  );

  await expect(client.prices({ addresses: ["X"] })).resolves.toEqual({});
});
