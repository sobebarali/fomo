import { z } from "zod";
import { solanaMint } from "../_shared/schema";

/**
 * Named input + output view for the `holders` router. `owner`/`amount` come from the BirdEye
 * `Holder` view type; `rank` and `percentage` are server-assigned at the boundary (the v3 holder
 * endpoint returns neither). The handler returns this exact shape into `.output(...)`, so any drift
 * fails `check-types` and the happy-path test.
 */

export const listInput = z.object({
  address: solanaMint,
  limit: z.number().int().min(1).max(100).default(20),
});

export const holder = z.object({
  owner: z.string(),
  amount: z.number(),
  percentage: z.number(),
  rank: z.number().int(),
});

export const listOutput = z.object({ items: z.array(holder) });
