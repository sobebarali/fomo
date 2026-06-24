import { afterEach, expect, it, vi } from "vitest";
import { createRedisCache, createRedisClient } from "./redis";

class FakeRedis {
  readonly store = new Map<string, unknown>();

  get<T>(key: string): Promise<T | null> {
    return Promise.resolve((this.store.get(key) as T | undefined) ?? null);
  }

  set<T>(key: string, value: T, _options: { ex: number }): Promise<"OK"> {
    this.store.set(key, value);
    return Promise.resolve("OK");
  }
}

afterEach(() => {
  vi.useRealTimers();
});

it("reuses Redis clients for the same credentials", () => {
  expect(createRedisClient("https://example.com", "token")).toBe(
    createRedisClient("https://example.com", "token")
  );
});

it("serves a fresh Redis cache hit without producing again", async () => {
  const redis = new FakeRedis();
  const cache = createRedisCache(redis, { prefix: "test" });
  const produce = vi.fn(() => Promise.resolve("v"));

  await cache.wrap("k", 1000, produce);
  await cache.wrap("k", 1000, produce);

  expect(produce).toHaveBeenCalledTimes(1);
});

it("returns stale Redis data immediately and refreshes in the background", async () => {
  const redis = new FakeRedis();
  const cache = createRedisCache(redis, { prefix: "test" });
  let n = 0;
  const produce = vi.fn(() => {
    n += 1;
    return Promise.resolve(`v${n}`);
  });

  expect(await cache.wrap("k", 5, produce)).toBe("v1");
  await new Promise((resolve) => setTimeout(resolve, 15));
  expect(await cache.wrap("k", 5, produce)).toBe("v1");
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(await cache.wrap("k", 5, produce)).toBe("v2");
  expect(produce).toHaveBeenCalledTimes(2);
});
