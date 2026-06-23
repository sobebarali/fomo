"use client";

import { Button } from "@fomo/ui/components/button";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";

import { client } from "@/utils/orpc";
import { formatTokenAmount, formatUsd } from "./format";

type Position = NonNullable<
  Awaited<ReturnType<typeof client.portfolio.position>>
>;

export function PositionCard({ address }: { address: string }) {
  const { authenticated, ready } = usePrivy();
  const { login } = useLogin();
  const position = useQuery({
    enabled: ready && authenticated,
    queryFn: () => client.portfolio.position({ address }),
    queryKey: ["position", address],
    refetchInterval: ready && authenticated ? 20_000 : false,
  });

  return (
    <section className="border-white/10 border-t bg-[#0b0f10] p-3 lg:border lg:p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">Position</h2>
        <span className="font-mono text-[#52605b] text-[10px]">PRIVY</span>
      </div>
      <PositionBody
        authenticated={authenticated}
        isError={position.isError}
        isLoading={position.isLoading}
        login={login}
        position={position.data ?? null}
        ready={ready}
      />
    </section>
  );
}

function PositionBody({
  authenticated,
  isError,
  isLoading,
  login,
  position,
  ready,
}: {
  authenticated: boolean;
  isError: boolean;
  isLoading: boolean;
  login: () => void;
  position: Position | null;
  ready: boolean;
}) {
  if (!ready) {
    return <PositionEmpty label="Checking wallet..." />;
  }

  if (!authenticated) {
    return (
      <div className="mt-3 border border-white/10 bg-[#101617] p-3">
        <p className="text-[#7d8b86] text-sm">Sign in to view your position.</p>
        <Button className="mt-3 w-full" onClick={() => login()} size="sm">
          Sign in
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return <PositionEmpty label="Loading position..." />;
  }

  if (isError || !position) {
    return <PositionEmpty label="No active position found." />;
  }

  return <PositionValues position={position} />;
}

function PositionValues({ position }: { position: Position }) {
  const avgBuy =
    position.avgBuyUsd === null ? "-" : formatUsd(position.avgBuyUsd);
  const pnl = position.pnlUsd === null ? "-" : formatUsd(position.pnlUsd);

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
      <Metric label="Amount" value={formatTokenAmount(position.amount)} />
      <Metric label="Value" value={formatUsd(position.valueUsd)} />
      <Metric label="Avg buy" value={avgBuy} />
      <Metric label="P/L" value={pnl} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-[#101617] p-3">
      <p className="text-[#7d8b86]">{label}</p>
      <p className="mt-1 truncate font-mono text-[#dce5df]">{value}</p>
    </div>
  );
}

function PositionEmpty({ label }: { label: string }) {
  return (
    <div className="mt-3 border border-white/10 bg-[#101617] p-3 text-[#7d8b86] text-sm">
      {label}
    </div>
  );
}
