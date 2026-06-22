/** Thrown when Alchemy returns HTTP 429. Routers map this → `RATE_LIMITED`. */
export class RateLimitError extends Error {
  constructor(message = "Alchemy rate limit exceeded") {
    super(message);
    this.name = "RateLimitError";
  }
}

/** Thrown for any non-2xx (other than 429), transport failure, JSON-RPC error, or malformed payload.
 *  Routers map this → `UPSTREAM_ERROR`. Messages never contain the RPC URL (which embeds the key). */
export class UpstreamError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "UpstreamError";
  }
}
