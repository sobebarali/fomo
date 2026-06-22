import { expect, it, vi } from "vitest";
import { RateLimitError, UpstreamError } from "../_shared/errors";
import { createRequester } from "./request";
import { jsonResponse } from "./test-helpers";

type FetchImpl = (url: string | URL, init?: RequestInit) => Promise<Response>;

function requesterWith(
  impl: FetchImpl,
  apiKey: string | undefined = "test-key"
) {
  const fetchMock = vi.fn(impl);
  const request = createRequester({
    fetch: fetchMock as unknown as typeof fetch,
    apiKey,
    baseUrl: "https://api.jup.ag",
    limiter: { take: () => Promise.resolve() },
  });
  return { request, fetchMock };
}

it("maps HTTP 429 to RateLimitError", async () => {
  const { request } = requesterWith(() =>
    Promise.resolve(new Response("slow down", { status: 429 }))
  );

  await expect(request("/swap/v2/order", {})).rejects.toBeInstanceOf(
    RateLimitError
  );
});

it("maps a non-2xx response to UpstreamError", async () => {
  const { request } = requesterWith(() =>
    Promise.resolve(new Response("boom", { status: 500 }))
  );

  await expect(request("/swap/v2/order", {})).rejects.toBeInstanceOf(
    UpstreamError
  );
});

it("maps invalid JSON to UpstreamError", async () => {
  const { request } = requesterWith(() =>
    Promise.resolve(new Response("not json", { status: 200 }))
  );

  await expect(request("/swap/v2/order", {})).rejects.toBeInstanceOf(
    UpstreamError
  );
});

it("sends the key as x-api-key and omits undefined params", async () => {
  const { request, fetchMock } = requesterWith(
    () => Promise.resolve(jsonResponse({ ok: true })),
    "super-secret"
  );

  await request("/swap/v2/order", { amount: "100", slippageBps: undefined });

  const call = fetchMock.mock.calls[0];
  const url = call?.[0];
  const headers = call?.[1]?.headers as Record<string, string>;
  expect(headers["x-api-key"]).toBe("super-secret");
  expect(String(url)).toContain("amount=100");
  expect(String(url)).not.toContain("slippageBps");
});

it("omits the x-api-key header on the keyless tier", async () => {
  // Build the requester with `apiKey` omitted (passing `undefined` would trigger the helper default).
  const impl: FetchImpl = () => Promise.resolve(jsonResponse({ ok: true }));
  const fetchMock = vi.fn(impl);
  const request = createRequester({
    fetch: fetchMock as unknown as typeof fetch,
    baseUrl: "https://api.jup.ag",
    limiter: { take: () => Promise.resolve() },
  });

  await request("/swap/v2/order", {});

  const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<
    string,
    string
  >;
  expect(headers["x-api-key"]).toBeUndefined();
});

it("never leaks the API key in an error message", async () => {
  const { request } = requesterWith(
    () => Promise.resolve(new Response("boom", { status: 500 })),
    "super-secret"
  );

  const error = await request("/swap/v2/order", {}).catch(
    (caught: unknown) => caught
  );

  expect(error).toBeInstanceOf(UpstreamError);
  expect(String(error)).not.toContain("super-secret");
});
