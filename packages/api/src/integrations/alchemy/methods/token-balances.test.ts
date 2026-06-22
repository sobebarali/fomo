import { expect, it } from "vitest";
// fixture: REAL — captured from the live Alchemy API (getTokenAccountsByOwner), trimmed to 2 entries.
import tokenAccounts from "../__fixtures__/token-accounts.json";
import { jsonResponse, makeClient } from "../test-helpers";

const WALLET = "GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ";

it("maps each token account to { address, amount, decimals }", async () => {
  const { client } = makeClient(() =>
    Promise.resolve(jsonResponse(tokenAccounts))
  );

  const result = await client.getTokenBalances(WALLET);

  expect(result).toEqual([
    {
      address: "Dr12Gb7e28jczJrAsuwMnkuoKfqnnBkkUDCJsqD6z5w6",
      amount: 42_000_096_617_229.57,
      decimals: 5,
    },
    {
      address: "Ct5S83KSSgyZxeXabSUaYGEQEsnbU5koj2KxFU2svxPy",
      amount: 100_000_000,
      decimals: 6,
    },
  ]);
});
