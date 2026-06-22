interface CacheEntry {
  expires: number;
  value: unknown;
}

export interface Cache {
  wrap<T>(key: string, ttl: number, produce: () => Promise<T>): Promise<T>;
}

/** Bounded stale-while-revalidate TTL cache: a fresh hit returns instantly; a stale hit returns the
 *  old value immediately AND refreshes in the background (so the caller never blocks on a refetch);
 *  a cold miss blocks on the first fetch. Concurrent producers for one key are deduped. Evicts the
 *  oldest entry once `max` is reached (FIFO). A hit takes no rate-limit token. */
export function createCache(max: number): Cache {
  const store = new Map<string, CacheEntry>();
  const pending = new Map<string, Promise<unknown>>();

  function set(key: string, value: unknown, ttl: number): void {
    if (store.size >= max && !store.has(key)) {
      const oldest = store.keys().next().value;
      if (oldest !== undefined) {
        store.delete(oldest);
      }
    }
    store.set(key, { value, expires: Date.now() + ttl });
  }

  function fetchAndStore(
    key: string,
    ttl: number,
    produce: () => Promise<unknown>
  ): Promise<unknown> {
    const existing = pending.get(key);
    if (existing) {
      return existing;
    }
    // `finally` runs before the returned promise settles, so the in-flight marker is always cleared
    // by the time a caller's await resolves — and a rejection still propagates to a cold caller.
    const promise = (async () => {
      try {
        const value = await produce();
        set(key, value, ttl);
        return value;
      } finally {
        pending.delete(key);
      }
    })();
    pending.set(key, promise);
    return promise;
  }

  return {
    wrap<T>(key: string, ttl: number, produce: () => Promise<T>): Promise<T> {
      const entry = store.get(key);
      if (entry) {
        if (entry.expires < Date.now()) {
          // Stale: refresh in the background and keep serving the old value — a transient upstream
          // failure leaves the stale value in place rather than dropping the cache.
          fetchAndStore(key, ttl, produce).catch(() => undefined);
        }
        return Promise.resolve(entry.value as T);
      }
      return fetchAndStore(key, ttl, produce) as Promise<T>;
    },
  };
}
