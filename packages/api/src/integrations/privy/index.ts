import { env as serverEnv } from "@fomo/env/server";
import { env as webEnv } from "@fomo/env/web";
import { PrivyClient } from "@privy-io/node";

import { type Cache, createCache } from "../_shared/cache";
import {
  type AuthSession,
  extractEmail,
  extractSolanaWallet,
  privyUserSchema,
} from "./schema";

const DEFAULT_CACHE_MAX = 500;
const USER_TTL_MS = 60_000;
const BEARER_PREFIX = "Bearer ";
const TOKEN_COOKIE_RE = /(?:^|;\s*)privy-token=([^;]+)/;

export interface PrivyVerifier {
  /** Verify the request's Privy token → a trusted session, or `null` if absent/invalid. Never throws. */
  verifyToken(req: Request): Promise<AuthSession | null>;
}

export interface PrivyClientOptions {
  cache?: Cache;
  cacheMax?: number;
  getUser?: (userId: string) => Promise<unknown>;
  /** Test seams — default to the real Privy SDK (built lazily so importing this module stays offline). */
  verifyAccessToken?: (token: string) => Promise<{ user_id: string }>;
}

let sdk: PrivyClient | null = null;
function sdkClient(): PrivyClient {
  sdk ??= new PrivyClient({
    appId: webEnv.NEXT_PUBLIC_PRIVY_APP_ID,
    appSecret: serverEnv.PRIVY_APP_SECRET,
  });
  return sdk;
}

/** Privy's access token rides either the `Authorization: Bearer` header or the `privy-token` cookie. */
function readToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (header?.startsWith(BEARER_PREFIX)) {
    return header.slice(BEARER_PREFIX.length).trim();
  }
  const cookieToken = req.headers.get("cookie")?.match(TOKEN_COOKIE_RE)?.[1];
  return cookieToken ? decodeURIComponent(cookieToken) : null;
}

export function createPrivyClient(
  options: PrivyClientOptions = {}
): PrivyVerifier {
  const cache =
    options.cache ?? createCache(options.cacheMax ?? DEFAULT_CACHE_MAX);
  const verifyAccessToken =
    options.verifyAccessToken ??
    ((token: string) => sdkClient().utils().auth().verifyAccessToken(token));
  const getUser =
    options.getUser ?? ((userId: string) => sdkClient().users()._get(userId));

  return {
    async verifyToken(req) {
      const token = readToken(req);
      if (!token) {
        return null;
      }

      let privyId: string;
      try {
        privyId = (await verifyAccessToken(token)).user_id;
      } catch {
        return null; // forged / expired / wrong app — an expected unauth state, not an error
      }

      // The verified token already proves identity; email + wallet are best-effort enrichment.
      // ponytail: getUser cached per privyId (60s); a fetch/parse failure degrades to a session with
      // null email/wallet rather than 500-ing every protected request when Privy's user API hiccups.
      try {
        const user = privyUserSchema.parse(
          await cache.wrap(privyId, USER_TTL_MS, () =>
            Promise.resolve(getUser(privyId))
          )
        );
        return {
          privyId,
          email: extractEmail(user),
          walletAddress: extractSolanaWallet(user),
        };
      } catch {
        return { privyId, email: null, walletAddress: null };
      }
    },
  };
}

/** The shared verifier `createContext` uses — one user cache, keys from `@fomo/env`. */
export const privy = createPrivyClient();
