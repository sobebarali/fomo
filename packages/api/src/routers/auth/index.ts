import { users } from "@fomo/db/schema";
import { ORPCError } from "@orpc/server";
import { eq, sql } from "drizzle-orm";

import { protectedProcedure } from "../../index";
import { userView } from "./schema";

const me = protectedProcedure
  .errors({ UNAUTHORIZED: {}, NOT_FOUND: {} })
  .output(userView)
  .handler(async ({ context }) => {
    const [user] = await context.db
      .select()
      .from(users)
      .where(eq(users.privyId, context.auth.privyId));

    if (!user) {
      throw new ORPCError("NOT_FOUND");
    }

    return {
      userId: user.id,
      privyId: user.privyId,
      email: user.email,
      walletAddress: user.walletAddress,
    };
  });

const sync = protectedProcedure
  .errors({ UNAUTHORIZED: {}, CONFLICT: {} })
  .output(userView)
  .handler(async ({ context }) => {
    const { privyId, email, walletAddress } = context.auth;

    // A degraded Privy session (token valid, user fetch failed) carries null email/wallet — coalesce
    // so a transient upstream hiccup never wipes a previously-synced address the portfolio depends on.
    const [user] = await context.db
      .insert(users)
      .values({ privyId, email, walletAddress })
      .onConflictDoUpdate({
        target: users.privyId,
        set: {
          email: sql`coalesce(excluded.email, ${users.email})`,
          walletAddress: sql`coalesce(excluded.wallet_address, ${users.walletAddress})`,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!user) {
      throw new ORPCError("CONFLICT");
    }

    return {
      userId: user.id,
      privyId: user.privyId,
      email: user.email,
      walletAddress: user.walletAddress,
    };
  });

export const authRouter = { me, sync };
