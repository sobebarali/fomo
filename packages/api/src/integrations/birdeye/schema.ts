import { z } from "zod";

// The cross-method view types now live in the provider-neutral `src/schemas/token.ts` (a 2nd provider
// needs them); re-exported here so `methods/*` and existing tests keep importing from `../schema`.
export type {
  Candle,
  Holder,
  TokenDetail,
  TokenSummary,
  Trade,
  TrendingSort,
} from "../../schemas/token";

/** Every BirdEye response is `{ success, data }`. The transport validates this envelope generically;
 *  each method then validates `data` with its own schema. */
export const Envelope = z.object({
  success: z.boolean(),
  data: z.unknown(),
});

export type Envelope = z.infer<typeof Envelope>;
