import { z } from "zod";

/**
 * Shared view type the client returns — the `portfolio` router imports this. Each RPC method's raw
 * `result` schema + normalizer lives in its own `methods/<name>.ts`; only the cross-method shape and
 * the JSON-RPC envelope live here.
 */
export interface TokenBalance {
  address: string;
  amount: number;
  decimals: number;
}

/** Every Alchemy response is a JSON-RPC 2.0 envelope: a `result` on success, an `error` on failure.
 *  The transport validates this generically; each method then validates `result` with its own schema. */
export const RpcResponse = z.object({
  jsonrpc: z.string(),
  id: z.union([z.number(), z.string()]).nullish(),
  result: z.unknown().optional(),
  error: z.object({ code: z.number(), message: z.string() }).nullish(),
});

export type RpcResponse = z.infer<typeof RpcResponse>;
