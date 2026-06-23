import { expect, it } from "vitest";
// fixtures: REAL — captured from the live Alchemy RPC (getTokenLargestAccounts + getMultipleAccounts).
import largest from "../__fixtures__/largest-accounts.json";
import multiple from "../__fixtures__/multiple-accounts.json";
import { jsonResponse, makeClient } from "../test-helpers";

const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";

function route(_url: string | URL, init?: RequestInit): Response {
  const method = (JSON.parse(String(init?.body)) as { method: string }).method;
  return method === "getTokenLargestAccounts"
    ? jsonResponse(largest)
    : jsonResponse(multiple);
}

it("resolves the largest token accounts to owner wallets with ui amounts", async () => {
  const { client } = makeClient((url, init) =>
    Promise.resolve(route(url, init))
  );

  const result = await client.holders({ address: BONK, limit: 20 });

  expect(result).toEqual([
    {
      address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      amount: 6_996_666_051_223.375,
    },
    {
      address: "51yZyDSnec4xnUv7XLRVYcDyV4x3wUtzrDcRaYbmQU5j",
      amount: 4_712_047_669_409.045,
    },
  ]);
});

it("caps the holder list at the requested limit", async () => {
  const { client, fetchMock } = makeClient((url, init) =>
    Promise.resolve(route(url, init))
  );

  const result = await client.holders({ address: BONK, limit: 1 });

  expect(result).toHaveLength(1);
  // Only the sliced accounts are sent for owner resolution.
  const multiCall = fetchMock.mock.calls
    .map((call) => JSON.parse(String((call[1] as RequestInit).body)))
    .find((body) => body.method === "getMultipleAccounts");
  expect(multiCall.params[0]).toHaveLength(1);
});
