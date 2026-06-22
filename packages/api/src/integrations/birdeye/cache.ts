interface CacheEntry {
  expires: number;
  value: unknown;
}

export interface Cache {
  wrap<T>(key: string, ttl: number, produce: () => Promise<T>): Promise<T>;
}

/** Bounded read-through TTL cache: a hit returns the stored value (and takes no rate-limit token);
 *  a miss runs `produce`, stores it, and evicts the oldest entry once `max` is reached (FIFO). */
export function createCache(max: number): Cache {
  const store = new Map<string, CacheEntry>();

  function get(key: string): unknown {
    const entry = store.get(key);
    if (!entry) {
      return;
    }
    if (entry.expires < Date.now()) {
      store.delete(key);
      return;
    }
    return entry.value;
  }

  function set(key: string, value: unknown, ttl: number): void {
    if (store.size >= max && !store.has(key)) {
      const oldest = store.keys().next().value;
      if (oldest !== undefined) {
        store.delete(oldest);
      }
    }
    store.set(key, { value, expires: Date.now() + ttl });
  }

  return {
    async wrap<T>(
      key: string,
      ttl: number,
      produce: () => Promise<T>
    ): Promise<T> {
      const hit = get(key);
      if (hit !== undefined) {
        return hit as T;
      }
      const value = await produce();
      set(key, value, ttl);
      return value;
    },
  };
}
