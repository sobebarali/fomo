"use client";

import { usePrivy } from "@privy-io/react-auth";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Signed-in users skip the marketing page and land on the trading dashboard —
// this covers both "already signed in" and the moment a Privy login completes.
export function LandingRedirect() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && authenticated) {
      router.replace("/trade" as Route);
    }
  }, [ready, authenticated, router]);

  return null;
}
