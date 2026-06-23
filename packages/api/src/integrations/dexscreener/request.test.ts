import { expect, it, vi } from "vitest";
import { RateLimitError, UpstreamError } from "../_shared/errors";
import { createRequester } from "./request";
import { jsonResponse } from "./test-helpers";

type FetchImpl = (url: string | URL, init?: RequestInit) => Promise<Response>;

function requesterWith(impl: FetchImpl) {
  const fetchMock = vi.fn(impl);
  const request = createRequester({
    fetch: fetchMock as unknown as typeof fetch,
    baseUrl: "https://api.dexscreener.com",
    limiter: { take: () => Promise.resolve() },
  });
  return { request, fetchMock };
}

it("returns the parsed JSON body on success", async () => {
  const { request } = requesterWith(() =>
    Promise.resolve(jsonResponse([{ ok: true }]))
  );

  await expect(request("/tokens/v1/solana/x")).resolves.toEqual([{ ok: true }]);
});

it("maps HTTP 429 to RateLimitError", async () => {
  const { request } = requesterWith(() =>
    Promise.resolve(new Response("slow down", { status: 429 }))
  );

  await expect(request("/tokens/v1/solana/x")).rejects.toBeInstanceOf(
    RateLimitError
  );
});

it("maps a non-2xx response to UpstreamError", async () => {
  const { request } = requesterWith(() =>
    Promise.resolve(new Response("boom", { status: 500 }))
  );

  await expect(request("/tokens/v1/solana/x")).rejects.toBeInstanceOf(
    UpstreamError
  );
});

it("maps invalid JSON to UpstreamError", async () => {
  const { request } = requesterWith(() =>
    Promise.resolve(new Response("not json", { status: 200 }))
  );

  await expect(request("/tokens/v1/solana/x")).rejects.toBeInstanceOf(
    UpstreamError
  );
});
