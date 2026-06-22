import { expect, it } from "vitest";
import { createLimiter } from "./limiter";

it("resolves every concurrent take", async () => {
  const limiter = createLimiter(1000);

  const results = await Promise.all(
    Array.from({ length: 10 }, () => limiter.take())
  );

  expect(results).toHaveLength(10);
});

it("still resolves takes beyond the initial bucket (refill path)", async () => {
  const limiter = createLimiter(5); // bucket starts at 5; 8 takes → 3 wait for refill

  const results = await Promise.all(
    Array.from({ length: 8 }, () => limiter.take())
  );

  expect(results).toHaveLength(8);
});
