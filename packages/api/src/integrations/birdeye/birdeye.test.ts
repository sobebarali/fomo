import { expect, it, vi } from "vitest";
import { createBirdEyeClient, RateLimitError, UpstreamError } from "./index";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

type FetchImpl = (url: string | URL, init?: RequestInit) => Promise<Response>;

function clientWith(impl: FetchImpl, apiKey = "test-key") {
  const fetchMock = vi.fn(impl);
  const client = createBirdEyeClient({
    fetch: fetchMock as unknown as typeof fetch,
    apiKey,
    requestsPerSecond: 1000,
    cacheMax: 100,
  });
  return { client, fetchMock };
}

const TRENDING_PAYLOAD = {
  success: true,
  data: {
    tokens: [
      {
        address: "Mint111",
        symbol: "AAA",
        name: "Token A",
        logoURI: "https://logo",
        price: 1.5,
        price24hChangePercent: 10,
        volume24hUSD: 1000,
        marketcap: 5000,
        extra: "ignored",
      },
    ],
  },
};

it("normalizes a trending response to TokenSummary[]", async () => {
  const { client } = clientWith(() =>
    Promise.resolve(jsonResponse(TRENDING_PAYLOAD))
  );

  const result = await client.trending({
    sort: "trending",
    limit: 10,
    offset: 0,
  });

  expect(result).toEqual([
    {
      address: "Mint111",
      symbol: "AAA",
      name: "Token A",
      logoUri: "https://logo",
      priceUsd: 1.5,
      change24h: 10,
      volume24h: 1000,
      marketCap: 5000,
    },
  ]);
});

it("serves a second identical call from the read-through cache", async () => {
  const { client, fetchMock } = clientWith(() =>
    Promise.resolve(jsonResponse(TRENDING_PAYLOAD))
  );

  await client.trending({ sort: "trending", limit: 10, offset: 0 });
  await client.trending({ sort: "trending", limit: 10, offset: 0 });

  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("rate-limits without dropping concurrent calls", async () => {
  const { client, fetchMock } = clientWith(() =>
    Promise.resolve(jsonResponse(TRENDING_PAYLOAD))
  );

  const results = await Promise.all([
    client.trending({ sort: "trending", limit: 10, offset: 0 }),
    client.trending({ sort: "trending", limit: 10, offset: 1 }),
    client.trending({ sort: "trending", limit: 10, offset: 2 }),
  ]);

  expect(results).toHaveLength(3);
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

it("maps HTTP 429 to RateLimitError", async () => {
  const { client } = clientWith(() =>
    Promise.resolve(new Response("slow down", { status: 429 }))
  );

  await expect(
    client.trending({ sort: "trending", limit: 10, offset: 0 })
  ).rejects.toBeInstanceOf(RateLimitError);
});

it("maps a non-2xx response to UpstreamError", async () => {
  const { client } = clientWith(() =>
    Promise.resolve(new Response("boom", { status: 500 }))
  );

  await expect(
    client.trending({ sort: "trending", limit: 10, offset: 0 })
  ).rejects.toBeInstanceOf(UpstreamError);
});

it("maps invalid JSON to UpstreamError", async () => {
  const { client } = clientWith(() =>
    Promise.resolve(new Response("not json", { status: 200 }))
  );

  await expect(
    client.trending({ sort: "trending", limit: 10, offset: 0 })
  ).rejects.toBeInstanceOf(UpstreamError);
});

it("maps a success:false envelope to UpstreamError", async () => {
  const { client } = clientWith(() =>
    Promise.resolve(jsonResponse({ success: false, data: null }))
  );

  await expect(
    client.trending({ sort: "trending", limit: 10, offset: 0 })
  ).rejects.toBeInstanceOf(UpstreamError);
});

it("maps a payload that fails Zod validation to UpstreamError", async () => {
  const { client } = clientWith(() =>
    Promise.resolve(jsonResponse({ success: true, data: { tokens: "nope" } }))
  );

  await expect(
    client.trending({ sort: "trending", limit: 10, offset: 0 })
  ).rejects.toBeInstanceOf(UpstreamError);
});

it("returns null from token() when the mint is unknown (null data)", async () => {
  const { client } = clientWith(() =>
    Promise.resolve(jsonResponse({ success: true, data: null }))
  );

  await expect(client.token("UnknownMint")).resolves.toBeNull();
});

it("returns null from token() when the envelope reports failure", async () => {
  const { client } = clientWith(() =>
    Promise.resolve(jsonResponse({ success: false, data: null }))
  );

  await expect(client.token("UnknownMint")).resolves.toBeNull();
});

it("normalizes a token_overview response to TokenDetail", async () => {
  const { client } = clientWith(() =>
    Promise.resolve(
      jsonResponse({
        success: true,
        data: {
          address: "Mint111",
          symbol: "AAA",
          name: "Token A",
          logoURI: "https://logo",
          price: 1.5,
          priceChange24hPercent: 10,
          v24hUSD: 1000,
          mc: 5000,
          liquidity: 2000,
          holder: 42,
          totalSupply: 1_000_000,
          extensions: {
            website: "https://site",
            twitter: "https://x.com/a",
            description: "a memecoin",
          },
        },
      })
    )
  );

  await expect(client.token("Mint111")).resolves.toEqual({
    address: "Mint111",
    symbol: "AAA",
    name: "Token A",
    logoUri: "https://logo",
    priceUsd: 1.5,
    change24h: 10,
    volume24h: 1000,
    marketCap: 5000,
    liquidity: 2000,
    holders: 42,
    totalSupply: 1_000_000,
    description: "a memecoin",
    links: { website: "https://site", twitter: "https://x.com/a" },
  });
});

it("normalizes ohlcv candles", async () => {
  const { client } = clientWith(() =>
    Promise.resolve(
      jsonResponse({
        success: true,
        data: { items: [{ unixTime: 100, o: 1, h: 2, l: 0.5, c: 1.5, v: 9 }] },
      })
    )
  );

  await expect(
    client.ohlcv("Mint111", "15m", { from: 0, to: 200 })
  ).resolves.toEqual([
    { time: 100, open: 1, high: 2, low: 0.5, close: 1.5, volume: 9 },
  ]);
});

it("normalizes multi_price into an address→price map, skipping null entries", async () => {
  const { client } = clientWith(() =>
    Promise.resolve(
      jsonResponse({
        success: true,
        data: { Mint111: { value: 1.5 }, Mint222: null },
      })
    )
  );

  await expect(client.prices(["Mint111", "Mint222"])).resolves.toEqual({
    Mint111: 1.5,
  });
});

it("sends the API key as the X-API-KEY header and solana chain", async () => {
  const { client, fetchMock } = clientWith(
    () => Promise.resolve(jsonResponse(TRENDING_PAYLOAD)),
    "super-secret"
  );

  await client.trending({ sort: "trending", limit: 10, offset: 0 });

  const init = fetchMock.mock.calls[0]?.[1];
  const headers = init?.headers as Record<string, string>;
  expect(headers["X-API-KEY"]).toBe("super-secret");
  expect(headers["x-chain"]).toBe("solana");
});

it("never leaks the API key in an UpstreamError message", async () => {
  const { client } = clientWith(
    () => Promise.resolve(new Response("boom", { status: 500 })),
    "super-secret"
  );

  const error = await client
    .trending({ sort: "trending", limit: 10, offset: 0 })
    .catch((caught: unknown) => caught);

  expect(error).toBeInstanceOf(UpstreamError);
  expect(String(error)).not.toContain("super-secret");
});
