"use client";

import type { AppRouterClient } from "@fomo/api/routers/index";
import Image from "next/image";
import Link from "next/link";

export type TokenSummary = Awaited<
  ReturnType<AppRouterClient["tokens"]["trending"]>
>["items"][number];

const LOGO_PX = 20;

function formatPrice(value: number): string {
  if (value >= 1) {
    return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  }
  return `$${value.toLocaleString("en-US", { maximumSignificantDigits: 4 })}`;
}

function formatChange(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function Pill({
  token,
  duplicate,
}: {
  token: TokenSummary;
  duplicate?: boolean;
}) {
  const isUp = token.change24h >= 0;
  return (
    <Link
      aria-hidden={duplicate}
      className="flex shrink-0 items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-accent/60"
      href={`/trade/${token.address}`}
      tabIndex={duplicate ? -1 : undefined}
    >
      {token.logoUri ? (
        <Image
          alt=""
          className="rounded-full"
          height={LOGO_PX}
          src={token.logoUri}
          unoptimized
          width={LOGO_PX}
        />
      ) : (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent font-bold text-[10px]">
          {token.symbol.slice(0, 1)}
        </span>
      )}
      <span className="font-semibold text-foreground">{token.symbol}</span>
      <span className="text-muted-foreground">
        {formatPrice(token.priceUsd)}
      </span>
      <span className={isUp ? "text-primary" : "text-destructive"}>
        {formatChange(token.change24h)}
      </span>
    </Link>
  );
}

export function TokenBanner({
  tokens,
  reverse = false,
}: {
  tokens: TokenSummary[];
  reverse?: boolean;
}) {
  if (tokens.length === 0) {
    return (
      <div
        aria-hidden
        className="h-[41px] w-full border-border/60 border-y bg-card/40"
      />
    );
  }

  const ordered = reverse ? [...tokens].reverse() : tokens;

  return (
    <div
      className={`marquee border-border/60 border-y bg-card/40 ${
        reverse ? "marquee--reverse" : ""
      }`}
    >
      <div className="marquee__track">
        {ordered.map((token) => (
          <Pill key={`a-${token.address}`} token={token} />
        ))}
        {ordered.map((token) => (
          <Pill duplicate key={`b-${token.address}`} token={token} />
        ))}
      </div>
    </div>
  );
}
