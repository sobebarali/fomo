/** Thrown when an upstream service returns HTTP 429. Routers map this → `RATE_LIMITED`. */
export class RateLimitError extends Error {
  constructor(message = "Upstream rate limit exceeded") {
    super(message);
    this.name = "RateLimitError";
  }
}

/** Thrown for any non-2xx (other than 429), transport failure, or malformed/invalid payload.
 *  Routers map this → `UPSTREAM_ERROR`. Messages never contain an API key. */
export class UpstreamError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "UpstreamError";
  }
}
