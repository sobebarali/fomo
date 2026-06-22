import { type AlchemyClientOptions, createContext } from "./context";
import { makeGetSolBalance } from "./methods/sol-balance";
import { makeGetTokenBalances } from "./methods/token-balances";
import type { TokenBalance } from "./schema";

export interface AlchemyClient {
  getSolBalance(wallet: string): Promise<number>;
  getTokenBalances(wallet: string): Promise<TokenBalance[]>;
}

/** Assemble the client — one shared context (cache + rate-limiter) wired into every method. */
export function createAlchemyClient(
  options?: AlchemyClientOptions
): AlchemyClient {
  const ctx = createContext(options);
  return {
    getSolBalance: makeGetSolBalance(ctx),
    getTokenBalances: makeGetTokenBalances(ctx),
  };
}

/** The single shared instance routers import — one cache, one rate-limiter, URL from env. */
export const alchemy = createAlchemyClient();
