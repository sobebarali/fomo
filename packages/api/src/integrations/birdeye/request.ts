import { RateLimitError, UpstreamError } from "./errors";
import type { Limiter } from "./limiter";
import { Envelope } from "./schema";

export type RequestParams = Record<string, string | number | undefined>;

export type Requester = (
  path: string,
  params: RequestParams
) => Promise<Envelope>;

export interface RequesterOptions {
  apiKey: string;
  baseUrl: string;
  fetch: typeof fetch;
  limiter: Limiter;
}

/** The shared transport: rate-limit → fetch (key in the `X-API-KEY` header) → map status/JSON/envelope
 *  failures to tagged errors. `429 → RateLimitError`; everything else bad → `UpstreamError`. The API
 *  key only ever travels in the header and never appears in an error message. */
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

    let response: Response;
    try {
      response = await fetchImpl(url, {
        headers: {
          "X-API-KEY": apiKey,
          "x-chain": "solana",
          accept: "application/json",
        },
      });
    } catch (cause) {
      throw new UpstreamError("BirdEye request failed", { cause });
    }

    if (response.status === 429) {
      throw new RateLimitError();
    }
    if (!response.ok) {
      throw new UpstreamError(`BirdEye responded ${response.status}`);
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch (cause) {
      throw new UpstreamError("BirdEye returned invalid JSON", { cause });
    }

    const result = Envelope.safeParse(json);
    if (!result.success) {
      throw new UpstreamError("BirdEye returned an unexpected envelope");
    }
    return result.data;
  };
}
