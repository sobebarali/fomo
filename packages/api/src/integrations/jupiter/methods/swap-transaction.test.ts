import { expect, it } from "vitest";
import { UpstreamError } from "../../_shared/errors";
// fixture: REAL — captured from the live Jupiter API (GET /swap/v2/order with a funded taker).
import orderTx from "../__fixtures__/order-tx.json";
import { jsonResponse, makeClient } from "../test-helpers";

const PARAMS = {
  inputMint: "So11111111111111111111111111111111111111112",
  outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  amount: "10000",
  slippageBps: 50,
  userPublicKey: "5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9",
};

it("returns the unsigned base64 transaction + requestId", async () => {
  const { client } = makeClient(() => Promise.resolve(jsonResponse(orderTx)));

  const result = await client.swapTransaction(PARAMS);

  expect(result).toEqual({
    swapTransaction: orderTx.transaction,
    requestId: orderTx.requestId,
  });
  expect(result.swapTransaction.length).toBeGreaterThan(0);
});

it("sends the taker as the order's `taker` so Jupiter assembles the tx", async () => {
  const { client, fetchMock } = makeClient(() =>
    Promise.resolve(jsonResponse(orderTx))
  );

  await client.swapTransaction(PARAMS);

  const url = String(fetchMock.mock.calls[0]?.[0]);
  expect(url).toContain("/swap/v2/order");
  expect(url).toContain("taker=5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9");
});

it("throws UpstreamError when the order can't be built (empty tx + errorCode)", async () => {
  const failed = {
    ...orderTx,
    transaction: "",
    errorCode: 1,
    errorMessage: "Insufficient funds",
  };
  const { client } = makeClient(() => Promise.resolve(jsonResponse(failed)));

  await expect(client.swapTransaction(PARAMS)).rejects.toBeInstanceOf(
    UpstreamError
  );
});
