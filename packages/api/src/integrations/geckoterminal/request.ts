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

// GeckoTerminal pins its response shape behind an Accept-header version (apiguide.geckoterminal.com).
const ACCEPT = "application/json;version=20230302";
const TRAILING_SLASH = /\/$/;

/** Shared transport: rate-limit → GET (versioned Accept header) → return the parsed JSON:API body.
 *  Keyless. `429 → RateLimitError`; any other non-2xx / invalid JSON / transport failure →
 *  `UpstreamError`. */
export function createRequester({
  baseUrl,
  fetch: fetchImpl,
  limiter,
}: RequesterOptions): Requester {
  return async (path, params = {}) => {
    await limiter.take();
    // Concatenate (not `new URL(path, baseUrl)`) — the base has a `/api/v2` path and `path` starts
    // with `/`, which `new URL` would resolve root-relative and drop the `/api/v2`.
    const url = new URL(`${baseUrl.replace(TRAILING_SLASH, "")}${path}`);
    for (const [name, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(name, String(value));
      }
    }

    let response: Response;
    try {
      response = await fetchImpl(url, { headers: { accept: ACCEPT } });
    } catch (cause) {
      throw new UpstreamError("GeckoTerminal request failed", { cause });
    }

    if (response.status === 429) {
      throw new RateLimitError();
    }
    if (!response.ok) {
      throw new UpstreamError(`GeckoTerminal responded ${response.status}`);
    }

    try {
      return await response.json();
    } catch (cause) {
      throw new UpstreamError("GeckoTerminal returned invalid JSON", { cause });
    }
  };
}
