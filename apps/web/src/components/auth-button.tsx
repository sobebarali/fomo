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
import { useLogin, usePrivy } from "@privy-io/react-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { orpc } from "@/utils/orpc";

function truncate(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function AuthButton() {
  const { ready, authenticated, user, logout } = usePrivy();
  const { login } = useLogin();
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
  const accountLabel = walletAddress ? truncate(walletAddress) : "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" variant="outline" />}>
        {accountLabel}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {walletAddress ? (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel>{truncate(walletAddress)}</DropdownMenuLabel>
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
