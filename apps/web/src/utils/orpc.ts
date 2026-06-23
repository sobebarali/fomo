import type { AppRouterClient } from "@fomo/api/routers/index";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { getAccessToken } from "@privy-io/react-auth";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Third-party APIs (BirdEye/Alchemy/Jupiter) surface a 429 as a `RATE_LIMITED` oRPC error.
function isRateLimited(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }
  return error.code === "RATE_LIMITED";
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Keep refetching through rate limits (backoff capped at 30s) so the UI fills in once the
        // limit clears, instead of dead-ending on an error. Any other error still fails fast.
        // ponytail: retries RATE_LIMITED indefinitely — a permanently-429ing key just polls every
        // 30s. Swap in a finite failureCount cap if that ever becomes a problem.
        retry: (_failureCount, error) => isRateLimited(error),
        retryDelay: (attemptIndex) =>
          Math.min(1000 * 2 ** attemptIndex, 30_000),
        // BirdEye free tier is a tiny CU budget, so spend it only on real navigation: no polling
        // (set per-island), no refetch on window focus, and treat data as fresh for 5min so
        // revisiting a token in the same session reuses the client cache instead of refetching.
        refetchOnWindowFocus: false,
        staleTime: 300_000,
      },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        // Rate limits are auto-retried above — don't nag with a toast while they recover.
        if (isRateLimited(error)) {
          return;
        }
        toast.error(`Error: ${error.message}`, {
          action: {
            label: "retry",
            onClick: () => {
              query.invalidate();
            },
          },
        });
      },
    }),
  });
}

export const queryClient = createQueryClient();

export const link = new RPCLink({
  url: `${typeof window === "undefined" ? "http://localhost:3001" : window.location.origin}/api/rpc`,
  headers: async () => {
    if (typeof window === "undefined") {
      return {};
    }
    const token = await getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
});

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
