import { expect, it, vi } from "vitest";
import { RateLimitError, UpstreamError } from "../_shared/errors";
import { createRequester } from "./request";
import { jsonResponse } from "./test-helpers";

type FetchImpl = (url: string | URL, init?: RequestInit) => Promise<Response>;

function requesterWith(impl: FetchImpl) {
  const fetchMock = vi.fn(impl);
  const request = createRequester({
    fetch: fetchMock as unknown as typeof fetch,
    baseUrl: "https://api.geckoterminal.com/api/v2",
    limiter: { take: () => Promise.resolve() },
  });
  return { request, fetchMock };
}

it("sends the versioned Accept header", async () => {
  const { request, fetchMock } = requesterWith(() =>
    Promise.resolve(jsonResponse({ data: [] }))
  );

  await request("/networks/solana/trending_pools");

  const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
  expect((init.headers as Record<string, string>).accept).toBe(
    "application/json;version=20230302"
  );
});

it("preserves the /api/v2 base path (path starting with / must not drop it)", async () => {
  const { request, fetchMock } = requesterWith(() =>
    Promise.resolve(jsonResponse({ data: [] }))
  );

  await request("/networks/solana/trending_pools", { include: "base_token" });

  expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
    "https://api.geckoterminal.com/api/v2/networks/solana/trending_pools?include=base_token"
  );
});

it("maps HTTP 429 to RateLimitError", async () => {
  const { request } = requesterWith(() =>
    Promise.resolve(new Response("slow down", { status: 429 }))
  );

  await expect(request("/x")).rejects.toBeInstanceOf(RateLimitError);
});

it("maps a non-2xx response to UpstreamError", async () => {
  const { request } = requesterWith(() =>
    Promise.resolve(new Response("boom", { status: 500 }))
  );

  await expect(request("/x")).rejects.toBeInstanceOf(UpstreamError);
});

it("maps invalid JSON to UpstreamError", async () => {
  const { request } = requesterWith(() =>
    Promise.resolve(new Response("not json", { status: 200 }))
  );

  await expect(request("/x")).rejects.toBeInstanceOf(UpstreamError);
});
