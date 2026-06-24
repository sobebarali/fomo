import { vi } from "vitest";
import { createCache } from "../_shared/cache";
import { createLimiter } from "../_shared/limiter";
import { createAlchemyClient } from "./index";

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
export function makeClient(impl: FetchImpl, rpcUrl = "https://rpc.test/key") {
  const fetchMock = vi.fn(impl);
  const client = createAlchemyClient({
    fetch: fetchMock as unknown as typeof fetch,
    rpcUrl,
    cache: createCache(100),
    limiter: createLimiter(1000),
    requestsPerSecond: 1000,
  });
  return { client, fetchMock };
}
