"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const TOKEN_PREFIX = "token:";
const TRADES_PREFIX = "trades:";

function tokenAddress(pathname: string): string | null {
  const parts = pathname.split("/");
  return parts[1] === "trade" && parts[2] ? parts[2] : null;
}

// One EventSource per trade tab. The server poller pushes trending + the active token's token/trades
// to every connected client; we write each into the TanStack cache so the islands' `useQuery` reads
// go live with no per-client polling. EventSource auto-reconnects; the route warm-starts on connect.
export function MarketStream() {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const address = tokenAddress(pathname);

  useEffect(() => {
    const url = address
      ? `/api/stream?address=${encodeURIComponent(address)}`
      : "/api/stream";
    const source = new EventSource(url);

    source.addEventListener("message", (event) => {
      let payload: { channel: string; data: unknown };
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }
      const { channel, data } = payload;
      if (channel === "trending") {
        queryClient.setQueryData(["trending"], data);
      } else if (channel.startsWith(TOKEN_PREFIX)) {
        queryClient.setQueryData(
          ["token", channel.slice(TOKEN_PREFIX.length)],
          data
        );
      } else if (channel.startsWith(TRADES_PREFIX)) {
        queryClient.setQueryData(
          ["trades", channel.slice(TRADES_PREFIX.length)],
          data
        );
      }
    });

    return () => source.close();
  }, [address, queryClient]);

  return null;
}
