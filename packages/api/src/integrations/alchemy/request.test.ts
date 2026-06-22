import { expect, it, vi } from "vitest";
import { RateLimitError, UpstreamError } from "./errors";
import { createRequester } from "./request";
import { jsonResponse } from "./test-helpers";

type FetchImpl = (url: string | URL, init?: RequestInit) => Promise<Response>;

function requesterWith(impl: FetchImpl, rpcUrl = "https://rpc.test/key") {
  const fetchMock = vi.fn(impl);
  const request = createRequester({
    fetch: fetchMock as unknown as typeof fetch,
    rpcUrl,
    limiter: { take: () => Promise.resolve() },
  });
  return { request, fetchMock };
}

it("maps HTTP 429 to RateLimitError", async () => {
  const { request } = requesterWith(() =>
    Promise.resolve(new Response("slow down", { status: 429 }))
  );

  await expect(request("getBalance", [])).rejects.toBeInstanceOf(
    RateLimitError
  );
});

it("maps a non-2xx response to UpstreamError", async () => {
  const { request } = requesterWith(() =>
    Promise.resolve(new Response("boom", { status: 500 }))
  );

  await expect(request("getBalance", [])).rejects.toBeInstanceOf(UpstreamError);
});

it("maps invalid JSON to UpstreamError", async () => {
  const { request } = requesterWith(() =>
    Promise.resolve(new Response("not json", { status: 200 }))
  );

  await expect(request("getBalance", [])).rejects.toBeInstanceOf(UpstreamError);
});

it("maps an unexpected envelope to UpstreamError", async () => {
  const { request } = requesterWith(() =>
    Promise.resolve(jsonResponse({ nope: true }))
  );

  await expect(request("getBalance", [])).rejects.toBeInstanceOf(UpstreamError);
});

it("maps a JSON-RPC error to UpstreamError", async () => {
  const { request } = requesterWith(() =>
    Promise.resolve(
      jsonResponse({
        jsonrpc: "2.0",
        id: 1,
        error: { code: -32_602, message: "Invalid params" },
      })
    )
  );

  await expect(request("getBalance", [])).rejects.toBeInstanceOf(UpstreamError);
});

it("POSTs a valid JSON-RPC body to the rpc url", async () => {
  const { request, fetchMock } = requesterWith(() =>
    Promise.resolve(jsonResponse({ jsonrpc: "2.0", id: 1, result: 1 }))
  );

  await request("getBalance", ["wallet-x"]);

  const call = fetchMock.mock.calls[0];
  const init = call?.[1];
  expect(call?.[0]).toBe("https://rpc.test/key");
  expect(init?.method).toBe("POST");
  expect(JSON.parse(String(init?.body))).toEqual({
    jsonrpc: "2.0",
    id: 1,
    method: "getBalance",
    params: ["wallet-x"],
  });
});

it("never leaks the rpc url (which embeds the key) in an error message", async () => {
  const { request } = requesterWith(
    () => Promise.resolve(new Response("boom", { status: 500 })),
    "https://rpc.test/super-secret-key"
  );

  const error = await request("getBalance", []).catch(
    (caught: unknown) => caught
  );

  expect(error).toBeInstanceOf(UpstreamError);
  expect(String(error)).not.toContain("super-secret-key");
});
