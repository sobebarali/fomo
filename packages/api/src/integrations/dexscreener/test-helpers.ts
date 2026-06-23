import { vi } from "vitest";
import { createDexScreenerClient } from "./index";

/** Build a `Response` from a JSON body — the shape `fetch` hands back. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

type FetchImpl = (url: string | URL, init?: RequestInit) => Promise<Response>;

/** A client whose transport is a stubbed `fetch` and whose limiter is effectively disabled, so
 *  method tests stay deterministic and offline. */
export function makeClient(impl: FetchImpl) {
  const fetchMock = vi.fn(impl);
  const client = createDexScreenerClient({
    fetch: fetchMock as unknown as typeof fetch,
    requestsPerSecond: 1000,
    cacheMax: 100,
  });
  return { client, fetchMock };
}
