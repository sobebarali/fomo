import { expect, it, vi } from "vitest";
import type { Candle, TokenDetail, Trade } from "../../schemas/token";
import { RateLimitError, UpstreamError } from "../_shared/errors";
import { createMarketClient } from "./index";

const ADDRESS = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const HEDGE_DELAY_MS = 1200;

const baseToken: TokenDetail = {
  address: ADDRESS,
  symbol: "BONK",
  name: "Bonk",
  logoUri: null,
  priceUsd: 0.000_004,
  change24h: -4,
  volume24h: 1000,
  marketCap: 5000,
  liquidity: 2000,
  holders: 0,
  totalSupply: 0,
  description: null,
  links: {},
};
const candle: Candle = {
  close: 0.000_004,
  high: 0.000_005,
  low: 0.000_003,
  open: 0.000_004,
  time: 1_782_200_700,
  volume: 1000,
};
const trade: Trade = {
  amount: 100,
  blockUnixTime: 1_782_200_700,
  owner: "9xQeWvG816bUx9EPfN1xM2wzRvyZwC5xr2uD2B3m3B9D",
  priceUsd: 0.01,
  side: "buy",
  txHash: "5NwYj6tJwXhL6v4sH9qA6hB9pQ2rT7mL1cV8sD3nE4fG",
};

function deps(overrides = {}) {
  return {
    alchemy: {
      getTokenSupply: vi.fn(() => Promise.resolve(1_000_000)),
      holders: vi.fn(() => Promise.resolve([])),
    },
    birdeye: {
      trending: vi.fn(() => Promise.resolve([])),
      token: vi.fn(() => Promise.resolve(baseToken)),
      ohlcv: vi.fn(() => Promise.resolve([])),
      trades: vi.fn(() => Promise.resolve([])),
      holders: vi.fn(() => Promise.resolve([])),
    },
    dexscreener: { token: vi.fn(() => Promise.resolve(baseToken)) },
    geckoterminal: {
      trending: vi.fn(() => Promise.resolve([])),
      ohlcv: vi.fn(() => Promise.resolve([])),
      trades: vi.fn(() => Promise.resolve([])),
    },
    ...overrides,
  };
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

async function advanceTimers(ms: number): Promise<void> {
  vi.advanceTimersByTime(ms);
  await Promise.resolve();
  await Promise.resolve();
}

it("token reads from BirdEye first", async () => {
  const market = createMarketClient(deps());

  const result = await market.token({ address: ADDRESS });

  expect(result?.totalSupply).toBe(0);
  expect(result?.priceUsd).toBe(0.000_004);
});

it("token falls back to DexScreener plus Alchemy supply when BirdEye fails", async () => {
  const d = deps({
    birdeye: {
      trending: vi.fn(() => Promise.resolve([])),
      token: vi.fn(() => Promise.reject(new RateLimitError())),
      ohlcv: vi.fn(() => Promise.resolve([])),
      trades: vi.fn(() => Promise.resolve([])),
      holders: vi.fn(() => Promise.resolve([])),
    },
  });
  const market = createMarketClient(d);

  const result = await market.token({ address: ADDRESS });

  expect(result?.totalSupply).toBe(1_000_000);
  expect(d.dexscreener.token).toHaveBeenCalledTimes(1);
});

it("token fallback degrades totalSupply to 0 when the supply lookup fails", async () => {
  const market = createMarketClient(
    deps({
      birdeye: {
        trending: vi.fn(() => Promise.resolve([])),
        token: vi.fn(() => Promise.resolve(null)),
        ohlcv: vi.fn(() => Promise.resolve([])),
        trades: vi.fn(() => Promise.resolve([])),
        holders: vi.fn(() => Promise.resolve([])),
      },
      alchemy: {
        getTokenSupply: vi.fn(() => Promise.reject(new UpstreamError("boom"))),
        holders: vi.fn(() => Promise.resolve([])),
      },
    })
  );

  const result = await market.token({ address: ADDRESS });

  expect(result?.totalSupply).toBe(0);
  expect(result?.priceUsd).toBe(0.000_004);
});

it("token returns null when DexScreener has no pair", async () => {
  const market = createMarketClient(
    deps({
      birdeye: {
        trending: vi.fn(() => Promise.resolve([])),
        token: vi.fn(() => Promise.resolve(null)),
        ohlcv: vi.fn(() => Promise.resolve([])),
        trades: vi.fn(() => Promise.resolve([])),
        holders: vi.fn(() => Promise.resolve([])),
      },
      dexscreener: { token: vi.fn(() => Promise.resolve(null)) },
    })
  );

  expect(await market.token({ address: ADDRESS })).toBeNull();
});

it("delegates trending/token/ohlcv/trades/holders to BirdEye first", async () => {
  const d = deps();
  const market = createMarketClient(d);

  await market.trending({ sort: "trending", limit: 10, offset: 0 });
  await market.token({ address: ADDRESS });
  await market.ohlcv({ address: ADDRESS, interval: "15m", from: 0, to: 1 });
  await market.trades({ address: ADDRESS, limit: 30 });
  await market.holders({ address: ADDRESS, limit: 20 });

  expect(d.birdeye.trending).toHaveBeenCalledTimes(1);
  expect(d.birdeye.token).toHaveBeenCalledTimes(1);
  expect(d.birdeye.ohlcv).toHaveBeenCalledTimes(1);
  expect(d.birdeye.trades).toHaveBeenCalledTimes(1);
  expect(d.birdeye.holders).toHaveBeenCalledTimes(1);
});

it("falls back to GeckoTerminal when BirdEye trending fails", async () => {
  const d = deps({
    birdeye: {
      trending: vi.fn(() => Promise.reject(new UpstreamError("down"))),
      token: vi.fn(() => Promise.resolve(baseToken)),
      ohlcv: vi.fn(() => Promise.resolve([])),
      trades: vi.fn(() => Promise.resolve([])),
      holders: vi.fn(() => Promise.resolve([])),
    },
  });
  const market = createMarketClient(d);

  await market.trending({ sort: "trending", limit: 10, offset: 0 });

  expect(d.geckoterminal.trending).toHaveBeenCalledTimes(1);
});

it("hedges slow BirdEye chart reads with GeckoTerminal", async () => {
  vi.useFakeTimers();
  try {
    const slowBirdEye = deferred<Candle[]>();
    const d = deps({
      birdeye: {
        trending: vi.fn(() => Promise.resolve([])),
        token: vi.fn(() => Promise.resolve(baseToken)),
        ohlcv: vi.fn(() => slowBirdEye.promise),
        trades: vi.fn(() => Promise.resolve([])),
        holders: vi.fn(() => Promise.resolve([])),
      },
      geckoterminal: {
        trending: vi.fn(() => Promise.resolve([])),
        ohlcv: vi.fn(() => Promise.resolve([candle])),
        trades: vi.fn(() => Promise.resolve([])),
      },
    });
    const market = createMarketClient(d);

    const result = market.ohlcv({
      address: ADDRESS,
      interval: "15m",
      from: 1,
      to: 2,
    });
    await advanceTimers(HEDGE_DELAY_MS);

    await expect(result).resolves.toEqual([candle]);
    expect(d.birdeye.ohlcv).toHaveBeenCalledTimes(1);
    expect(d.geckoterminal.ohlcv).toHaveBeenCalledTimes(1);
  } finally {
    vi.useRealTimers();
  }
});

it("hedges slow BirdEye trade reads with GeckoTerminal", async () => {
  vi.useFakeTimers();
  try {
    const slowBirdEye = deferred<Trade[]>();
    const d = deps({
      birdeye: {
        trending: vi.fn(() => Promise.resolve([])),
        token: vi.fn(() => Promise.resolve(baseToken)),
        ohlcv: vi.fn(() => Promise.resolve([])),
        trades: vi.fn(() => slowBirdEye.promise),
        holders: vi.fn(() => Promise.resolve([])),
      },
      geckoterminal: {
        trending: vi.fn(() => Promise.resolve([])),
        ohlcv: vi.fn(() => Promise.resolve([])),
        trades: vi.fn(() => Promise.resolve([trade])),
      },
    });
    const market = createMarketClient(d);

    const result = market.trades({ address: ADDRESS, limit: 20 });
    await advanceTimers(HEDGE_DELAY_MS);

    await expect(result).resolves.toEqual([trade]);
    expect(d.birdeye.trades).toHaveBeenCalledTimes(1);
    expect(d.geckoterminal.trades).toHaveBeenCalledTimes(1);
  } finally {
    vi.useRealTimers();
  }
});
