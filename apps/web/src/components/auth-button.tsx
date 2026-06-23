"use client";

import { Button } from "@fomo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@fomo/ui/components/dropdown-menu";
import type { WalletWithMetadata } from "@privy-io/react-auth";
import { useLogin, useLogout, usePrivy } from "@privy-io/react-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { orpc } from "@/utils/orpc";

function truncate(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

// The human identity from the social/email login (Apple/Google/email), preferred over the wallet
// address for the account chip.
function displayName(user: ReturnType<typeof usePrivy>["user"]): string | null {
  if (!user) {
    return null;
  }
  const candidates = [
    user.google?.name,
    user.google?.email,
    user.apple?.email,
    user.email?.address,
  ];
  return candidates.find((value) => value && value.length > 0) ?? null;
}

export function AuthButton() {
  const { ready, authenticated, user } = usePrivy();
  const router = useRouter();
  const { login } = useLogin();
  const { logout } = useLogout({ onSuccess: () => router.push("/") });
  const [synced, setSynced] = useState(false);

  const { mutate: syncUser } = useMutation(
    orpc.auth.sync.mutationOptions({ onSuccess: () => setSynced(true) })
  );

  const me = useQuery(
    orpc.auth.me.queryOptions({
      enabled: authenticated && synced,
      retry: false,
    })
  );

  // The embedded Solana wallet is created asynchronously after login, so its address
  // can be absent on the first sync — re-sync when it resolves (sync is idempotent).
  const solanaWalletAddress =
    user?.linkedAccounts.find(
      (account): account is WalletWithMetadata =>
        account.type === "wallet" && account.chainType === "solana"
    )?.address ?? null;

  useEffect(() => {
    if (!authenticated) {
      setSynced(false);
      return;
    }
    syncUser(undefined);
  }, [authenticated, solanaWalletAddress, syncUser]);

  if (!ready) {
    return (
      <Button disabled size="sm" variant="outline">
        Sign in
      </Button>
    );
  }

  if (!authenticated) {
    return (
      <Button onClick={() => login()} size="sm">
        Sign in
      </Button>
    );
  }

  const walletAddress = me.data?.walletAddress ?? solanaWalletAddress;
  const name = displayName(user);
  const accountLabel =
    name ?? (walletAddress ? truncate(walletAddress) : "Account");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            className="max-w-[12rem] truncate"
            size="sm"
            variant="outline"
          />
        }
      >
        {accountLabel}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {name || walletAddress ? (
          <>
            <DropdownMenuGroup>
              {name ? <DropdownMenuLabel>{name}</DropdownMenuLabel> : null}
              {walletAddress ? (
                <DropdownMenuLabel className="font-mono font-normal text-[#7d8b86] text-xs">
                  {truncate(walletAddress)}
                </DropdownMenuLabel>
              ) : null}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem onClick={() => logout()} variant="destructive">
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
