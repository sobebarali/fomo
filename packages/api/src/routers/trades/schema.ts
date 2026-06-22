import { z } from "zod";
import { solanaMint } from "../_shared/schema";

/**
 * Named input + output view for the `trades` router. The output mirrors the row shape in
 * `trades/AGENTS.md`; the handler returns it from `.output(...)`, so a renamed/dropped field fails
 * `check-types` / the happy-path test — no shape drift. `solanaMint` is shared from `_shared/schema`.
 */

export const recentInput = z.object({
  address: solanaMint,
  limit: z.number().int().min(1).max(100).default(30),
});

export const recentOutput = z.object({
  items: z.array(
    z.object({
      txHash: z.string(),
      side: z.enum(["buy", "sell"]),
      priceUsd: z.number(),
      amountToken: z.number(),
      amountUsd: z.number(),
      trader: z.string(),
      time: z.number(),
    })
  ),
});
