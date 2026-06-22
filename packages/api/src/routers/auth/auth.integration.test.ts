import type { Db } from "@fomo/db";
import { users } from "@fomo/db/schema";
import { createTestDb } from "@fomo/db/testing";
import { call } from "@orpc/server";
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";
import type { AuthSession } from "../../integrations/privy/schema";
import { testContext } from "../../test-support/context";
import { appRouter } from "../index";

const session: AuthSession = {
  privyId: "did:privy:abc123",
  email: "chad@fomo.family",
  walletAddress: "So11111111111111111111111111111111111111112",
};

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

it("rejects me without a verified session", async () => {
  await expect(
    call(appRouter.auth.me, undefined, { context: testContext(db) })
  ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
});

it("rejects sync without a verified session", async () => {
  await expect(
    call(appRouter.auth.sync, undefined, { context: testContext(db) })
  ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
});

it("returns NOT_FOUND from me before the user is synced", async () => {
  await expect(
    call(appRouter.auth.me, undefined, { context: testContext(db, session) })
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});

it("syncs the user then returns it from me", async () => {
  const synced = await call(appRouter.auth.sync, undefined, {
    context: testContext(db, session),
  });

  expect(synced).toMatchObject({
    privyId: session.privyId,
    email: session.email,
    walletAddress: session.walletAddress,
  });
  expect(synced.userId).toEqual(expect.any(String));

  const me = await call(appRouter.auth.me, undefined, {
    context: testContext(db, session),
  });

  expect(me).toEqual(synced);
});

it("preserves email/wallet when a later sync has a degraded (null) session", async () => {
  await call(appRouter.auth.sync, undefined, {
    context: testContext(db, session),
  });

  const degraded = await call(appRouter.auth.sync, undefined, {
    context: testContext(db, {
      privyId: session.privyId,
      email: null,
      walletAddress: null,
    }),
  });

  expect(degraded.email).toBe(session.email);
  expect(degraded.walletAddress).toBe(session.walletAddress);
});

it("is idempotent — sync twice yields one row and reflects updates", async () => {
  await call(appRouter.auth.sync, undefined, {
    context: testContext(db, session),
  });
  const second = await call(appRouter.auth.sync, undefined, {
    context: testContext(db, { ...session, email: "new@fomo.family" }),
  });

  const rows = await db.select().from(users);
  expect(rows).toHaveLength(1);
  expect(second.email).toBe("new@fomo.family");
});
