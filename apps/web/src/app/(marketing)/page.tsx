import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import {
  TokenBanner,
  type TokenSummary,
} from "@/components/banners/token-banner";
import { LandingRedirect } from "@/components/landing-redirect";
import { StartTradingButton } from "@/components/start-trading-button";
import { StoreBadges } from "@/components/store-badges";
import { client } from "@/utils/orpc";

export const metadata: Metadata = {
  title: "ChadWallet — where traders become chads",
  description:
    "From memecoins to viral tokens, trade any Solana token in seconds. Sign in with Apple or Google.",
};

// All App-Store preview screenshots → one scrolling band.
const SCREENS = [
  "discover",
  "search",
  "token",
  "portfolio",
  "kol",
  "x",
  "launch",
  "deposit",
  "splash",
] as const;

// All product-flow montages → the "never miss out again" feature grid.
const FLOWS = [
  {
    file: "buy-sell-4",
    title: "Buy & sell trending tokens",
    blurb: "One-tap swaps on any Solana memecoin, gasless.",
  },
  {
    file: "memecoin-4",
    title: "Catch early trends on X",
    blurb: "Spot narratives before they pump.",
  },
  {
    file: "kol-4",
    title: "Follow the smartest traders",
    blurb: "Track the wallets that keep winning.",
  },
  {
    file: "launch-4",
    title: "Launch a coin from a tweet",
    blurb: "Spin up a token in seconds.",
  },
  {
    file: "portfolio-4",
    title: "Track your whole portfolio",
    blurb: "Live P/L across every position.",
  },
  {
    file: "relaunch-4",
    title: "Relaunch in one tap",
    blurb: "Re-enter your winners instantly.",
  },
] as const;

const FOOTER_COLUMNS = [
  { title: "ABOUT", links: ["Blog", "FAQ", "Affiliates", "Careers"] },
  {
    title: "SOCIAL",
    links: ["Discord", "X / Twitter", "Instagram", "YouTube", "LinkedIn"],
  },
  {
    title: "LEGAL",
    links: ["Privacy Policy", "Terms of Service", "Disclosures"],
  },
] as const;

// Floating coins positioned around the centered hero phone.
const COIN_SPOTS = [
  "-left-12 top-10",
  "-right-10 top-28",
  "-left-8 bottom-28",
  "-right-14 bottom-14",
] as const;

async function getTrending(): Promise<TokenSummary[]> {
  try {
    const result = await client.tokens.trending({
      limit: 20,
      sort: "trending",
    });
    return result.items;
  } catch {
    // Real-data rule: on an upstream/rate-limit blip render the skeleton, never fake rows.
    return [];
  }
}

function Logo() {
  return (
    <Link className="flex items-center gap-2.5" href="/">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary p-1.5">
        <Image
          alt="ChadWallet"
          className="h-full w-full object-contain"
          height={36}
          src="/logo-black.png"
          width={36}
        />
      </span>
      <span className="font-semibold text-lg">ChadWallet</span>
    </Link>
  );
}

function Nav() {
  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
      <Logo />
      <nav className="flex items-center gap-4 text-sm">
        <a
          className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline"
          href="https://apps.apple.com/us/app/chadwallet/id6757367474"
          rel="noopener noreferrer"
          target="_blank"
        >
          App Store
        </a>
        <a
          className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline"
          href="https://play.google.com/store/apps/details?id=xyz.chadwallet.www"
          rel="noopener noreferrer"
          target="_blank"
        >
          Google Play
        </a>
        <StartTradingButton size="sm" />
      </nav>
    </header>
  );
}

function FloatingCoins({ tokens }: { tokens: TokenSummary[] }) {
  const coins = tokens
    .filter((token) => token.logoUri)
    .slice(0, COIN_SPOTS.length)
    .map((token, index) => ({ token, spot: COIN_SPOTS[index] ?? "" }));

  return (
    <>
      {coins.map(({ token, spot }, index) => (
        <div
          aria-hidden="true"
          className={`float absolute ${spot} rounded-full border border-border/60 bg-card/80 p-1 shadow-lg backdrop-blur`}
          key={token.address}
          style={{ animationDelay: `${index * 0.7}s` }}
        >
          <Image
            alt=""
            className="h-10 w-10 rounded-full"
            height={40}
            src={token.logoUri ?? ""}
            unoptimized
            width={40}
          />
        </div>
      ))}
    </>
  );
}

function Hero({ tokens }: { tokens: TokenSummary[] }) {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-center bg-cover opacity-[0.18]"
        style={{ backgroundImage: "url('/space-bg.jpg')" }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-b from-background/60 via-background/80 to-background"
      />
      <div
        aria-hidden="true"
        className="absolute top-1/3 left-1/2 -z-10 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/15 blur-[140px]"
      />
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 pt-20 text-center md:pt-28">
        <span className="rise inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Now live on iOS &amp; Android
        </span>
        <h1
          className="rise mt-6 font-bold text-5xl leading-[1.05] tracking-tight md:text-7xl"
          style={{ animationDelay: "60ms" }}
        >
          where traders
          <br />
          become <span className="text-primary">chads.</span>
        </h1>
        <p
          className="rise mt-6 max-w-xl text-balance text-lg text-muted-foreground md:text-xl"
          style={{ animationDelay: "120ms" }}
        >
          From memecoins to viral tokens, trade any Solana token in seconds.
        </p>
        <div
          className="rise mt-8 flex flex-col items-center gap-3"
          style={{ animationDelay: "180ms" }}
        >
          <StoreBadges />
          <p className="text-muted-foreground text-xs">
            Sign in with Apple or Google — your wallet, secured by Privy.
          </p>
        </div>
      </div>
      <div className="relative mx-auto mt-14 w-[280px] pb-24">
        <div
          aria-hidden="true"
          className="absolute -inset-10 -z-10 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          className="rise relative w-[280px] rounded-[2.5rem] border-4 border-neutral-800 bg-black p-2 shadow-2xl"
          style={{ animationDelay: "240ms" }}
        >
          <div className="overflow-hidden rounded-[2rem]">
            <Image
              alt="ChadWallet trading screen"
              className="h-auto w-full"
              height={1640}
              priority
              src="/app-screen.png"
              width={792}
            />
          </div>
        </div>
        <FloatingCoins tokens={tokens} />
      </div>
    </section>
  );
}

function AppGallery() {
  return (
    <section className="reveal py-20 md:py-28">
      <p className="px-6 text-center font-semibold text-primary text-xs tracking-[0.2em]">
        EVERYTHING YOU NEED TO APE IN
      </p>
      <h2 className="mt-3 px-6 text-center font-bold text-4xl md:text-5xl">
        the whole market, in your pocket
      </h2>
      <div className="marquee mt-14">
        <div className="marquee__track gap-5 px-2.5">
          {SCREENS.map((screen) => (
            <Image
              alt=""
              className="h-[380px] w-auto rounded-3xl border border-border/60 shadow-lg"
              height={1384}
              key={screen}
              src={`/screens/${screen}.png`}
              width={640}
            />
          ))}
          {SCREENS.map((screen) => (
            <Image
              alt=""
              aria-hidden="true"
              className="h-[380px] w-auto rounded-3xl border border-border/60 shadow-lg"
              height={1384}
              key={`dup-${screen}`}
              src={`/screens/${screen}.png`}
              width={640}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Showcase() {
  return (
    <section className="reveal mx-auto max-w-3xl px-6 py-20 text-center md:py-28">
      <h2 className="font-bold text-4xl leading-tight md:text-5xl">
        trade from anywhere.
        <br />
        never lose a beat.
      </h2>
      <p className="mx-auto mt-5 max-w-md text-muted-foreground">
        Open a trade on your phone, close it on your desktop — your positions,
        watchlist and alerts stay in sync across every device.
      </p>
      <div className="relative mx-auto mt-14 w-[280px]">
        <div
          aria-hidden="true"
          className="absolute -inset-10 -z-10 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative w-[280px] rounded-[2.5rem] border-4 border-neutral-800 bg-black p-2 shadow-2xl">
          <div className="overflow-hidden rounded-[2rem]">
            <video
              autoPlay
              className="h-[560px] w-full object-cover"
              loop
              muted
              playsInline
              poster="/screens/token.png"
            >
              <source src="/demo.mp4" type="video/mp4" />
              <track kind="captions" />
            </video>
          </div>
        </div>
      </div>
    </section>
  );
}

function Flows() {
  return (
    <section className="reveal mx-auto max-w-6xl px-6 py-20 md:py-28">
      <p className="text-center font-semibold text-primary text-xs tracking-[0.2em]">
        THE ONLY SOCIAL-FIRST TRADING APP ON SOLANA
      </p>
      <h2 className="mt-3 text-center font-bold text-4xl md:text-5xl">
        never miss out again
      </h2>
      <div className="mt-14 grid gap-8 md:grid-cols-2">
        {FLOWS.map((flow) => (
          <figure
            className="overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-lg transition-transform hover:scale-[1.01]"
            key={flow.file}
          >
            <Image
              alt={flow.title}
              className="h-auto w-full"
              height={675}
              src={`/flows/${flow.file}.png`}
              width={1200}
            />
            <figcaption className="p-6">
              <p className="font-semibold text-lg">{flow.title}</p>
              <p className="mt-1 text-muted-foreground text-sm">{flow.blurb}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function SocialProof() {
  return (
    <section className="reveal relative mx-auto max-w-7xl overflow-hidden px-6 py-24 text-center md:py-32">
      <Image
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 w-[420px] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-[0.05]"
        height={240}
        src="/logo-white.png"
        width={240}
      />
      <div className="relative mx-auto mb-10 h-64 w-64">
        <div className="spin-slow absolute inset-0 rounded-full border border-border/50 border-dashed" />
        <div className="spin-slow absolute inset-8 rounded-full border border-border/40 border-dashed [animation-direction:reverse]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary p-3 shadow-[0_0_60px] shadow-primary/50">
            <Image
              alt="ChadWallet"
              className="h-full w-full object-contain"
              height={80}
              src="/logo-black.png"
              width={80}
            />
          </span>
        </div>
      </div>
      <p className="font-semibold text-primary text-xs tracking-[0.2em]">
        A TRADING APP FOR THE REST OF US
      </p>
      <h2 className="mx-auto mt-3 max-w-2xl font-bold text-4xl md:text-5xl">
        join 500,000 chads trading on ChadWallet
      </h2>
    </section>
  );
}

function CtaBand() {
  return (
    <section className="reveal mx-auto max-w-6xl px-6 pb-28">
      <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card/60 to-background p-12 text-center md:p-16">
        <h2 className="font-bold text-4xl md:text-5xl">
          start trading in seconds
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Download ChadWallet, sign in with Apple or Google, and buy your first
          Solana memecoin in under a minute.
        </p>
        <div className="mt-8 flex justify-center">
          <StoreBadges />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-border/60 border-t">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-muted-foreground text-sm">
            The #1 memecoin trading app on Solana. Your keys, your coins —
            secured by Privy.
          </p>
          <div className="mt-5">
            <StoreBadges />
          </div>
        </div>
        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="font-semibold text-muted-foreground text-xs tracking-wider">
              {column.title}
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              {column.links.map((label) => (
                <li key={label}>
                  <span className="text-muted-foreground transition-colors hover:text-foreground">
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 pb-10 text-muted-foreground text-xs sm:flex-row sm:justify-between">
        <span>© 2026 ChadWallet. All rights reserved.</span>
        <span>Crypto trading involves risk. Not financial advice.</span>
      </div>
    </footer>
  );
}

export default async function LandingPage() {
  const tokens = await getTrending();

  return (
    <>
      <LandingRedirect />
      <TokenBanner tokens={tokens} />
      <Nav />
      <main>
        <Hero tokens={tokens} />
        <AppGallery />
        <Showcase />
        <Flows />
        <SocialProof />
        <CtaBand />
      </main>
      <TokenBanner reverse tokens={tokens} />
      <Footer />
    </>
  );
}
