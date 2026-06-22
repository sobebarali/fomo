import { afterAll, afterEach, beforeAll, expect, it } from "vitest";

import type { Db } from "./index";
import { users } from "./schema";
import { createTestDb } from "./testing";

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});

afterEach(async () => {
  await db.delete(users);
});

afterAll(async () => {
  await close();
});

// The runnable check that proves the Vitest + PGlite harness works end to end:
// a real schema is pushed into a real Postgres and a real round-trip succeeds.
it("inserts and reads a user through the PGlite harness", async () => {
  await db
    .insert(users)
    .values({ privyId: "did:privy:abc123", email: "chad@fomo.family" });

  const rows = await db.select().from(users);

  expect(rows).toHaveLength(1);
  expect(rows[0]?.privyId).toBe("did:privy:abc123");
  expect(rows[0]?.id).toBeDefined();
});

it("enforces the unique privyId constraint", async () => {
  await db.insert(users).values({ privyId: "did:privy:dup" });

  await expect(
    db.insert(users).values({ privyId: "did:privy:dup" })
  ).rejects.toThrow();
});
