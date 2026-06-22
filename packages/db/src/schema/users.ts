import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Privy-linked accounts. Market data (tokens/prices/holders/trades) is real-time from
 * BirdEye/Alchemy and is NOT persisted — this table holds only the user identity that
 * Privy authenticates plus their embedded Solana wallet address.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  privyId: text("privy_id").notNull().unique(),
  email: text("email"),
  walletAddress: text("wallet_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
