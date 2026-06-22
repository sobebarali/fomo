export interface Limiter {
  take(): Promise<void>;
}

/** Token bucket: refills `rps` tokens/sec, each request awaits a token. In-memory and per-instance —
 *  adequate for Vercel serverless; swap for a shared store if a fleet-wide limit is ever needed. */
export function createLimiter(rps: number): Limiter {
  const capacity = Math.max(1, rps);
  const queue: Array<() => void> = [];
  let tokens = capacity;
  let last = Date.now();

  function pump(): void {
    const now = Date.now();
    tokens = Math.min(capacity, tokens + ((now - last) / 1000) * rps);
    last = now;
    while (tokens >= 1 && queue.length > 0) {
      tokens -= 1;
      queue.shift()?.();
    }
    if (queue.length > 0) {
      setTimeout(pump, Math.max(((1 - tokens) / rps) * 1000, 10));
    }
  }

  return {
    take() {
      return new Promise<void>((resolve) => {
        queue.push(resolve);
        pump();
      });
    },
  };
}
