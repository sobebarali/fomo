"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// The server-rendered panels (trending sidebar, token header, holders) can't self-refetch like the
// client islands do. When the page rendered with a rate-limited panel, poll the server until the
// limit clears so those panels fill in without a manual reload. Unmounts (stopping the poll) once
// the server re-renders without the rate-limit flag.
const REFRESH_MS = 8000;

export function RateLimitRefresher() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
