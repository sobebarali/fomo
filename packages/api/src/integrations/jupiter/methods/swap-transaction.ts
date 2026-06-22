import { BadRequestError, UpstreamError } from "../../_shared/errors";
import { parseData } from "../../_shared/parse";
import type { JupiterContext } from "../context";
import { OrderResponse, type SwapTxResult } from "../schema";

const ORDER_PATH = "/swap/v2/order";

export interface SwapTransactionInput {
  amount: string;
  inputMint: string;
  outputMint: string;
  slippageBps?: number;
  userPublicKey: string;
}

/** `GET /swap/v2/order` **with** `taker` → the quote plus an unsigned base64 transaction. Not cached:
 *  the tx is taker-specific and time-sensitive (its blockhash expires). The server never signs. */
export function makeSwapTransaction(ctx: JupiterContext) {
  return async ({
    inputMint,
    outputMint,
    amount,
    slippageBps,
    userPublicKey,
  }: SwapTransactionInput): Promise<SwapTxResult> => {
    const raw = await ctx.request(ORDER_PATH, {
      inputMint,
      outputMint,
      amount,
      slippageBps,
      taker: userPublicKey,
    });
    const order = parseData(OrderResponse, raw);
    if (order.errorCode != null) {
      // User-actionable (e.g. "Insufficient funds") — surface Jupiter's reason, don't 500.
      throw new BadRequestError(
        order.errorMessage ?? "Jupiter could not build a swap transaction"
      );
    }
    if (!order.transaction) {
      throw new UpstreamError("Jupiter returned no swap transaction");
    }
    return {
      swapTransaction: order.transaction,
      requestId: order.requestId ?? "",
    };
  };
}
