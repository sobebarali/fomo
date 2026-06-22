import { z } from "zod";

// base58 mint (no 0/O/I/l), 32–44 chars. Invalid → Zod rejects at `.input()` → oRPC `BAD_REQUEST`.
export const solanaMint = z
  .string()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Invalid Solana mint address");
