import type { TokenDetail } from "../../schemas/token";
import { createContext, type DexScreenerClientOptions } from "./context";
import { makeToken, type TokenInput } from "./methods/token";

export interface DexScreenerClient {
  token(input: TokenInput): Promise<TokenDetail | null>;
}

/** Assemble the client — one shared context (cache + rate-limiter) wired into every method. */
export function createDexScreenerClient(
  options?: DexScreenerClientOptions
): DexScreenerClient {
  const ctx = createContext(options);
  return {
    token: makeToken(ctx),
  };
}

/** The single shared instance — one cache, one rate-limiter. Keyless. */
export const dexscreener = createDexScreenerClient();
