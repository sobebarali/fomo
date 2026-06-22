import { expect, it, vi } from "vitest";
import { RateLimitError, UpstreamError } from "./errors";
import { createRequester } from "./request";
import { jsonResponse } from "./test-helpers";

type FetchImpl = (url: string | URL, init?: RequestInit) => Promise<Response>;

function requesterWith(impl: FetchImpl, apiKey = "test-key") {
  const fetchMock = vi.fn(impl);
  const request = createRequester({
    fetch: fetchMock as unknown as typeof fetch,
    apiKey,
    baseUrl: "https://public-api.birdeye.so",
    limiter: { take: () => Promise.resolve() },
  });
  return { request, fetchMock };
}

it("maps HTTP 429 to RateLimitError", async () => {
  const { request } = requesterWith(() =>
    Promise.resolve(new Response("slow down", { status: 429 }))
  );

  await expect(request("/defi/x", {})).rejects.toBeInstanceOf(RateLimitError);
});

it("maps a non-2xx response to UpstreamError", async () => {
  const { request } = requesterWith(() =>
    Promise.resolve(new Response("boom", { status: 500 }))
  );

  await expect(request("/defi/x", {})).rejects.toBeInstanceOf(UpstreamError);
});

it("maps invalid JSON to UpstreamError", async () => {
  const { request } = requesterWith(() =>
    Promise.resolve(new Response("not json", { status: 200 }))
  );

  await expect(request("/defi/x", {})).rejects.toBeInstanceOf(UpstreamError);
});

it("maps an unexpected envelope to UpstreamError", async () => {
  const { request } = requesterWith(() =>
    Promise.resolve(jsonResponse({ nope: true }))
  );

  await expect(request("/defi/x", {})).rejects.toBeInstanceOf(UpstreamError);
});

it("sends the key as X-API-KEY + solana chain and omits undefined params", async () => {
  const { request, fetchMock } = requesterWith(
    () => Promise.resolve(jsonResponse({ success: true, data: {} })),
    "super-secret"
  );

  await request("/defi/token_trending", { limit: 5, cursor: undefined });

  const call = fetchMock.mock.calls[0];
  const url = call?.[0];
  const headers = call?.[1]?.headers as Record<string, string>;
  expect(headers["X-API-KEY"]).toBe("super-secret");
  expect(headers["x-chain"]).toBe("solana");
  expect(String(url)).toContain("limit=5");
  expect(String(url)).not.toContain("cursor");
});

it("never leaks the API key in an error message", async () => {
  const { request } = requesterWith(
    () => Promise.resolve(new Response("boom", { status: 500 })),
    "super-secret"
  );

  const error = await request("/defi/x", {}).catch((caught: unknown) => caught);

  expect(error).toBeInstanceOf(UpstreamError);
  expect(String(error)).not.toContain("super-secret");
});
