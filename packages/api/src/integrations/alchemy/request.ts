import { RateLimitError, UpstreamError } from "../_shared/errors";
import type { Limiter } from "../_shared/limiter";
import { RpcResponse } from "./schema";

export type Requester = (method: string, params: unknown[]) => Promise<unknown>;

export interface RequesterOptions {
  fetch: typeof fetch;
  limiter: Limiter;
  rpcUrl: string;
}

/** The shared transport: rate-limit → JSON-RPC POST (key embedded in `rpcUrl`) → map status/JSON/
 *  envelope/RPC-error failures to tagged errors. `429 → RateLimitError`; everything else bad →
 *  `UpstreamError`. The key only ever travels in the URL and never appears in an error message. */
export function createRequester({
  fetch: fetchImpl,
  limiter,
  rpcUrl,
}: RequesterOptions): Requester {
  return async (method, params) => {
    await limiter.take();

    let response: Response;
    try {
      response = await fetchImpl(rpcUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
    } catch (cause) {
      throw new UpstreamError("Alchemy request failed", { cause });
    }

    if (response.status === 429) {
      throw new RateLimitError();
    }
    if (!response.ok) {
      throw new UpstreamError(`Alchemy responded ${response.status}`);
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch (cause) {
      throw new UpstreamError("Alchemy returned invalid JSON", { cause });
    }

    const result = RpcResponse.safeParse(json);
    if (!result.success) {
      throw new UpstreamError("Alchemy returned an unexpected envelope");
    }
    if (result.data.error) {
      throw new UpstreamError("Alchemy reported an RPC error");
    }
    return result.data.result;
  };
}
