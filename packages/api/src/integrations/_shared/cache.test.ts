import { afterEach, expect, it, vi } from "vitest";
import { createCache } from "./cache";

afterEach(() => {
  vi.useRealTimers();
});

it("serves a repeat key from cache (produce runs once)", async () => {
  const cache = createCache(10);
  const produce = vi.fn(() => Promise.resolve("v"));

  await cache.wrap("k", 1000, produce);
  await cache.wrap("k", 1000, produce);

  expect(produce).toHaveBeenCalledTimes(1);
});

it("re-produces once the TTL has expired", async () => {
  vi.useFakeTimers();
  const cache = createCache(10);
  const produce = vi.fn(() => Promise.resolve("v"));

  await cache.wrap("k", 50, produce);
  vi.advanceTimersByTime(100);
  await cache.wrap("k", 50, produce);

  expect(produce).toHaveBeenCalledTimes(2);
});

it("serves the stale value immediately, then revalidates in the background", async () => {
  const cache = createCache(10);
  let n = 0;
  const produce = vi.fn(() => {
    n += 1;
    return Promise.resolve(`v${n}`);
  });

  expect(await cache.wrap("k", 5, produce)).toBe("v1");
  await new Promise((resolve) => setTimeout(resolve, 15)); // let the entry go stale
  // Stale read returns the old value without blocking, and kicks off a background refresh.
  expect(await cache.wrap("k", 5, produce)).toBe("v1");
  await new Promise((resolve) => setTimeout(resolve, 0)); // let the refresh settle
  // The next read sees the freshly revalidated value.
  expect(await cache.wrap("k", 5, produce)).toBe("v2");
  expect(produce).toHaveBeenCalledTimes(2);
});

it("dedupes concurrent producers for a cold key", async () => {
  const cache = createCache(10);
  const produce = vi.fn(() => Promise.resolve("v"));

  await Promise.all([
    cache.wrap("k", 1000, produce),
    cache.wrap("k", 1000, produce),
  ]);

  expect(produce).toHaveBeenCalledTimes(1);
});

it("evicts the oldest entry past the max size", async () => {
  const cache = createCache(2);
  const produce = vi.fn((value: string) => Promise.resolve(value));

  await cache.wrap("a", 1000, () => produce("a"));
  await cache.wrap("b", 1000, () => produce("b"));
  await cache.wrap("c", 1000, () => produce("c")); // evicts "a"
  await cache.wrap("a", 1000, () => produce("a")); // "a" gone → produced again

  expect(produce).toHaveBeenCalledTimes(4);
});
