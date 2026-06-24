"use client";

import { Button } from "@fomo/ui/components/button";
import { Input } from "@fomo/ui/components/input";
import { cn } from "@fomo/ui/lib/utils";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import {
  useSignAndSendTransaction,
  useWallets,
} from "@privy-io/react-auth/solana";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { client } from "@/utils/orpc";
import type { TokenDetail } from "./types";

const WSOL = "So11111111111111111111111111111111111111112";
const SOL_DECIMALS = 9;
const SOL_AMOUNT_PATTERN = /^\d*(?:\.\d{0,9})?$/;
const BASE_UNIT_PATTERN = /^\d*$/;

type Mode = "buy" | "sell";

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function solToLamports(value: string): string | null {
  const trimmed = value.trim();
  if (!(trimmed && SOL_AMOUNT_PATTERN.test(trimmed))) {
    return null;
  }

  const [whole = "0", fraction = ""] = trimmed.split(".");
  const paddedFraction = fraction.padEnd(SOL_DECIMALS, "0");
  const lamports =
    BigInt(whole || "0") * 1_000_000_000n + BigInt(paddedFraction || "0");
  return lamports > 0n ? lamports.toString() : null;
}

function amountToBaseUnits(value: string, mode: Mode): string | null {
  if (mode === "buy") {
    return solToLamports(value);
  }
  return BASE_UNIT_PATTERN.test(value) && value ? value : null;
}

function normalizeAmountInput(value: string, mode: Mode): string {
  if (mode === "buy") {
    const normalized = value.replace(/[^\d.]/g, "");
    const firstDot = normalized.indexOf(".");
    const withoutExtraDots =
      firstDot === -1
        ? normalized
        : `${normalized.slice(0, firstDot + 1)}${normalized
            .slice(firstDot + 1)
            .replaceAll(".", "")}`;
    const [whole = "", fraction] = withoutExtraDots.split(".");
    return fraction === undefined
      ? whole
      : `${whole}.${fraction.slice(0, SOL_DECIMALS)}`;
  }
  return value.replace(/\D/g, "");
}

export function SwapPanel({ token }: { token: TokenDetail | null }) {
  const [mode, setMode] = useState<Mode>("buy");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { authenticated, ready } = usePrivy();
  const { login } = useLogin();
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();

  const selectedWallet = wallets[0] ?? null;
  const baseUnitAmount = amountToBaseUnits(amount, mode);
  const params = useMemo(() => {
    if (!(token && baseUnitAmount)) {
      return null;
    }
    return {
      amount: baseUnitAmount,
      inputMint: mode === "buy" ? WSOL : token.address,
      outputMint: mode === "buy" ? token.address : WSOL,
      slippageBps: 50,
    };
  }, [baseUnitAmount, mode, token]);

  const quote = useMutation({
    mutationFn: () => {
      if (!params) {
        throw new Error(
          mode === "buy"
            ? "Enter a SOL amount."
            : "Enter a token base-unit amount."
        );
      }
      return client.swap.quote(params);
    },
    onError: () => setStatus("Quote unavailable."),
    onSuccess: () => setStatus(null),
  });

  const buildAndSign = useMutation({
    mutationFn: async () => {
      if (!(params && selectedWallet)) {
        throw new Error("Connect a Solana wallet first.");
      }
      const built = await client.swap.buildTransaction({
        ...params,
        userPublicKey: selectedWallet.address,
      });
      const result = await signAndSendTransaction({
        transaction: base64ToBytes(built.swapTransaction),
        wallet: selectedWallet,
      });
      return result.signature;
    },
    onError: (error) => setStatus(toSwapError(error)),
    onSuccess: () => setStatus("Transaction submitted."),
  });

  const disabled = !token || quote.isPending || buildAndSign.isPending;

  return (
    <section className="border-white/10 bg-[#0b0f10] p-3 lg:border lg:p-4">
      <div className="grid grid-cols-2 border border-white/10 bg-[#101617] p-0.5">
        {(["buy", "sell"] as const).map((nextMode) => (
          <button
            className={cn(
              "h-9 font-semibold text-xs uppercase",
              modeButtonClass(mode, nextMode)
            )}
            key={nextMode}
            onClick={() => {
              setMode(nextMode);
              setAmount("");
              quote.reset();
              setStatus(null);
            }}
            type="button"
          >
            {nextMode}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <label className="text-[#7d8b86] text-xs" htmlFor="swap-amount">
          {mode === "buy" ? "Amount in SOL" : "Amount in token base units"}
        </label>
        <Input
          className="mt-2 h-11 border-white/10 bg-[#101617] font-mono text-sm"
          disabled={!token}
          id="swap-amount"
          inputMode={mode === "buy" ? "decimal" : "numeric"}
          onChange={(event) => {
            setAmount(normalizeAmountInput(event.target.value, mode));
            quote.reset();
            setStatus(null);
          }}
          placeholder={mode === "buy" ? "0.0001" : "1000000"}
          value={amount}
        />
        <p className="mt-2 text-[#52605b] text-[11px]">
          {mode === "buy"
            ? "Converted to lamports for Jupiter."
            : "Sell input is token base units."}
        </p>
      </div>
      <QuoteSummary quote={quote.data ?? null} />
      {status ? (
        <p className="mt-3 border border-white/10 bg-[#101617] p-2 text-[#7d8b86] text-xs">
          {status}
        </p>
      ) : null}
      <SwapAction
        authenticated={authenticated}
        buildPending={buildAndSign.isPending}
        canQuote={Boolean(baseUnitAmount)}
        disabled={disabled}
        hasQuote={Boolean(quote.data)}
        login={login}
        mode={mode}
        quotePending={quote.isPending}
        ready={ready}
        selectedWallet={Boolean(selectedWallet)}
        startBuild={() => setConfirmOpen(true)}
        startQuote={() => quote.mutate()}
      />
      <ConfirmSwap
        mode={mode}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          buildAndSign.mutate();
        }}
        open={confirmOpen}
        outputAmount={quote.data?.outAmount ?? "-"}
        priceImpact={quote.data?.priceImpactPct ?? null}
      />
    </section>
  );
}

/** A user-facing swap error: prefer the server's reason (`BAD_REQUEST` carries Jupiter's message,
 *  e.g. "Insufficient funds"), but never show a raw `UPSTREAM_ERROR` code. */
function toSwapError(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "UPSTREAM_ERROR"
  ) {
    return "Couldn't build this swap right now. Please try again.";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Swap failed. Please try again.";
}

function modeButtonClass(current: Mode, next: Mode): string {
  if (current !== next) {
    return "text-[#7d8b86]";
  }
  if (next === "buy") {
    return "bg-[#16e27b] text-[#07100b]";
  }
  return "bg-[#f6465d] text-white";
}

type Quote = Awaited<ReturnType<typeof client.swap.quote>>;

function QuoteSummary({ quote }: { quote: Quote | null }) {
  const route = quote?.routePlan.map((step) => step.label).join(" / ") ?? "-";
  const priceImpact = quote ? `${quote.priceImpactPct.toFixed(3)}%` : "-";

  return (
    <div className="mt-3 border border-white/10 bg-[#101617] p-3 text-xs">
      <SummaryRow label="Slippage" value="0.50%" />
      <SummaryRow label="Route" value={route} />
      <SummaryRow label="Output" value={quote?.outAmount ?? "-"} />
      <SummaryRow label="Price impact" value={priceImpact} />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-2 flex justify-between gap-3 first:mt-0">
      <span className="text-[#7d8b86]">{label}</span>
      <span className="truncate font-mono">{value}</span>
    </div>
  );
}

function SwapAction({
  canQuote,
  authenticated,
  buildPending,
  disabled,
  hasQuote,
  login,
  mode,
  quotePending,
  ready,
  selectedWallet,
  startBuild,
  startQuote,
}: {
  canQuote: boolean;
  authenticated: boolean;
  buildPending: boolean;
  disabled: boolean;
  hasQuote: boolean;
  login: () => void;
  mode: Mode;
  quotePending: boolean;
  ready: boolean;
  selectedWallet: boolean;
  startBuild: () => void;
  startQuote: () => void;
}) {
  const variant = mode === "sell" ? "destructive" : "default";

  if (!ready) {
    return (
      <Button className="mt-4 w-full" disabled>
        Checking wallet
      </Button>
    );
  }

  if (!authenticated) {
    return (
      <Button className="mt-4 w-full" onClick={() => login()}>
        Sign in to trade
      </Button>
    );
  }

  if (!selectedWallet) {
    return (
      <Button className="mt-4 w-full" disabled>
        Connect Solana wallet
      </Button>
    );
  }

  if (hasQuote) {
    return (
      <Button
        className="mt-4 w-full"
        disabled={disabled}
        onClick={startBuild}
        variant={variant}
      >
        {buildPending ? "Submitting" : "Review & sign"}
      </Button>
    );
  }

  return (
    <Button
      className="mt-4 w-full"
      disabled={disabled || !canQuote}
      onClick={startQuote}
      variant={variant}
    >
      {quotePending ? "Quoting" : `Quote ${mode}`}
    </Button>
  );
}

function ConfirmSwap({
  mode,
  onCancel,
  onConfirm,
  open,
  outputAmount,
  priceImpact,
}: {
  mode: Mode;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  outputAmount: string;
  priceImpact: number | null;
}) {
  if (!open) {
    return null;
  }

  const impact = priceImpact === null ? "-" : `${priceImpact.toFixed(3)}%`;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-3 sm:items-center sm:justify-center">
      <div className="w-full border border-white/10 bg-[#0b0f10] p-4 text-sm sm:max-w-sm">
        <h2 className="font-semibold">Review swap</h2>
        <div className="mt-4 border border-white/10 bg-[#101617] p-3 text-xs">
          <SummaryRow label="Action" value={mode.toUpperCase()} />
          <SummaryRow label="Expected output" value={outputAmount} />
          <SummaryRow label="Max slippage" value="0.50%" />
          <SummaryRow label="Price impact" value={impact} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            variant={mode === "sell" ? "destructive" : "default"}
          >
            Sign
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MobileSwapBar({ token }: { token: TokenDetail | null }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 gap-2 border-white/10 border-t bg-[#0b0f10]/95 p-3 backdrop-blur lg:hidden">
      <a
        className="flex h-11 items-center justify-center bg-[#f6465d] font-semibold text-sm text-white"
        href="#swap-panel"
      >
        Sell
      </a>
      <a
        className="flex h-11 items-center justify-center bg-[#16e27b] font-semibold text-[#07100b] text-sm"
        href="#swap-panel"
      >
        Buy {token?.symbol ?? "Token"}
      </a>
    </div>
  );
}
