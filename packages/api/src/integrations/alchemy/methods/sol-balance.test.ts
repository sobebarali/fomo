import { expect, it } from "vitest";
// fixture: REAL — captured from the live Alchemy API (getBalance).
import balance from "../__fixtures__/get-balance.json";
import { jsonResponse, makeClient } from "../test-helpers";

const WALLET = "GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ";

it("normalizes lamports to SOL", async () => {
  const { client } = makeClient(() => Promise.resolve(jsonResponse(balance)));

  const result = await client.getSolBalance(WALLET);

  expect(result).toBe(326.045_032_452);
});
