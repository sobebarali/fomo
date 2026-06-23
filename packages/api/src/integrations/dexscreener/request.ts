import { RateLimitError, UpstreamError } from "../_shared/errors";
import type { Limiter } from "../_shared/limiter";

export type RequestParams = Record<string, string | number | undefined>;

export type Requester = (
  path: string,
  params?: RequestParams
) => Promise<unknown>;

export interface RequesterOptions {
  baseUrl: string;
  fetch: typeof fetch;
  limiter: Limiter;
}

/** Shared transport: rate-limit → GET → return the parsed JSON. DexScreener is keyless and returns a
 *  bare body (no `{success,data}` envelope), so the method validates the body directly. `429 →
 *  RateLimitError`; any other non-2xx / invalid JSON / transport failure → `UpstreamError`. */
export function createRequester({
  baseUrl,
  fetch: fetchImpl,
  limiter,
}: RequesterOptions): Requester {
  return async (path, params = {}) => {
    await limiter.take();
    const url = new URL(path, baseUrl);
    for (const [name, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(name, String(value));
      }
    }

    let response: Response;
    try {
      response = await fetchImpl(url, {
        headers: { accept: "application/json" },
      });
    } catch (cause) {
      throw new UpstreamError("DexScreener request failed", { cause });
    }

    if (response.status === 429) {
      throw new RateLimitError();
    }
    if (!response.ok) {
      throw new UpstreamError(`DexScreener responded ${response.status}`);
    }

    try {
      return await response.json();
    } catch (cause) {
      throw new UpstreamError("DexScreener returned invalid JSON", { cause });
    }
  };
}
