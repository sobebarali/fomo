import type { AppRouterClient } from "@fomo/api/routers/index";

export type TokenSummary = Awaited<
  ReturnType<AppRouterClient["tokens"]["trending"]>
>["items"][number];

export type TokenDetail = Awaited<ReturnType<AppRouterClient["tokens"]["get"]>>;

export type TokenPreview = TokenSummary &
  Partial<
    Pick<
      TokenDetail,
      "description" | "holders" | "links" | "liquidity" | "totalSupply"
    >
  >;

export type TokenView = TokenDetail | TokenPreview;

export type Candle = Awaited<
  ReturnType<AppRouterClient["chart"]["candles"]>
>["candles"][number];

export type Holder = Awaited<
  ReturnType<AppRouterClient["holders"]["list"]>
>["items"][number];

export type Trade = Awaited<
  ReturnType<AppRouterClient["trades"]["recent"]>
>["items"][number];

export type MarketErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR";

export type Loadable<T> =
  | { data: T; error: null }
  | { data: null; error: MarketErrorCode | "UNKNOWN" };
