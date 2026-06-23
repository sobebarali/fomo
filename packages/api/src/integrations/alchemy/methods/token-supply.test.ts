import { expect, it } from "vitest";
// fixture: REAL — captured from the live Alchemy RPC (getTokenSupply).
import supply from "../__fixtures__/token-supply.json";
import { jsonResponse, makeClient } from "../test-helpers";

const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";

it("returns the circulating supply uiAmount", async () => {
  const { client } = makeClient(() => Promise.resolve(jsonResponse(supply)));

  expect(await client.getTokenSupply({ address: BONK })).toBe(
    87_994_718_274_289.83
  );
});
