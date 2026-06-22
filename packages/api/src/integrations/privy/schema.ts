import { z } from "zod";

/** The verified Privy session attached to `context.auth`. `null` email/wallet = not linked (yet). */
export interface AuthSession {
  email: string | null;
  privyId: string;
  walletAddress: string | null;
}

/**
 * The slice of Privy's `User.linked_accounts` we read. Loose so an unknown account type (Privy adds
 * them often) never fails the parse — we only need email + the embedded Solana wallet address.
 */
const linkedAccountSchema = z.looseObject({
  type: z.string(),
  address: z.string().optional(),
  email: z.string().optional(),
  chain_type: z.string().optional(),
  connector_type: z.string().optional(),
});

export const privyUserSchema = z.looseObject({
  id: z.string(),
  linked_accounts: z.array(linkedAccountSchema).default([]),
});

export type PrivyUser = z.infer<typeof privyUserSchema>;

/** Prefer a dedicated email account; fall back to the email on a Google/Apple OAuth account. */
export function extractEmail(user: PrivyUser): string | null {
  for (const account of user.linked_accounts) {
    if (account.type === "email" && account.address) {
      return account.address;
    }
  }
  for (const account of user.linked_accounts) {
    if (
      (account.type === "google_oauth" || account.type === "apple_oauth") &&
      account.email
    ) {
      return account.email;
    }
  }
  return null;
}

/** The user's Privy-managed embedded Solana wallet — the one this app trades from. */
export function extractSolanaWallet(user: PrivyUser): string | null {
  for (const account of user.linked_accounts) {
    if (
      account.type === "wallet" &&
      account.chain_type === "solana" &&
      account.connector_type === "embedded" &&
      account.address
    ) {
      return account.address;
    }
  }
  return null;
}
