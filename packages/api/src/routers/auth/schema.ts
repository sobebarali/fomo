import { z } from "zod";

/** The serialized current-user view returned by both `me` and `sync`. */
export const userView = z.object({
  userId: z.string(),
  privyId: z.string(),
  email: z.string().nullable(),
  walletAddress: z.string().nullable(),
});

export type UserView = z.infer<typeof userView>;
