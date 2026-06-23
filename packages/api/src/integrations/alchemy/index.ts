import type { Holder } from "../../schemas/token";
import { type AlchemyClientOptions, createContext } from "./context";
import { type HoldersInput, makeHolders } from "./methods/largest-accounts";
import { makeGetSolBalance } from "./methods/sol-balance";
import { makeGetTokenBalances } from "./methods/token-balances";
import {
  makeGetTokenSupply,
  type TokenSupplyInput,
} from "./methods/token-supply";
import type { TokenBalance } from "./schema";

export interface AlchemyClient {
  getSolBalance(wallet: string): Promise<number>;
  getTokenBalances(wallet: string): Promise<TokenBalance[]>;
  getTokenSupply(input: TokenSupplyInput): Promise<number>;
  holders(input: HoldersInput): Promise<Holder[]>;
}

/** Assemble the client — one shared context (cache + rate-limiter) wired into every method. */
export function createAlchemyClient(
  options?: AlchemyClientOptions
): AlchemyClient {
  const ctx = createContext(options);
  return {
    getSolBalance: makeGetSolBalance(ctx),
    getTokenBalances: makeGetTokenBalances(ctx),
    getTokenSupply: makeGetTokenSupply(ctx),
    holders: makeHolders(ctx),
  };
}

/** The single shared instance routers import — one cache, one rate-limiter, URL from env. */
export const alchemy = createAlchemyClient();
