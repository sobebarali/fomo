import { RateLimitError, UpstreamError } from "../_shared/errors";
import type { Limiter } from "../_shared/limiter";

export type RequestParams = Record<string, string | number | undefined>;

export type Requester = (
  path: string,
  params: RequestParams
) => Promise<unknown>;

export interface RequesterOptions {
  apiKey?: string;
  baseUrl: string;
  fetch: typeof fetch;
  limiter: Limiter;
}

/** The shared transport: rate-limit → GET (key in the optional `x-api-key` header) → map
 *  status/JSON failures to tagged errors. `429 → RateLimitError`; everything else bad → `UpstreamError`.
 *  The key only ever travels in the header and never appears in an error message. Jupiter returns raw
 *  JSON objects (no `{ success, data }` envelope), so each method Zod-validates the returned payload. */
export function createRequester({
  apiKey,
  baseUrl,
  fetch: fetchImpl,
  limiter,
}: RequesterOptions): Requester {
  return async (path, params) => {
    await limiter.take();
    const url = new URL(path, baseUrl);
    for (const [name, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(name, String(value));
      }
    }

    const headers: Record<string, string> = { accept: "application/json" };
    if (apiKey) {
      headers["x-api-key"] = apiKey;
    }

    let response: Response;
    try {
      response = await fetchImpl(url, { headers });
    } catch (cause) {
      throw new UpstreamError("Jupiter request failed", { cause });
    }

    if (response.status === 429) {
      throw new RateLimitError();
    }
    if (!response.ok) {
      throw new UpstreamError(`Jupiter responded ${response.status}`);
    }

    try {
      return await response.json();
    } catch (cause) {
      throw new UpstreamError("Jupiter returned invalid JSON", { cause });
    }
  };
}
