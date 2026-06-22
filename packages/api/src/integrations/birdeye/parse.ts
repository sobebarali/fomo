import type { z } from "zod";
import { UpstreamError } from "./errors";

/** Validate an upstream `data` payload with a per-endpoint schema; a Zod failure becomes an
 *  `UpstreamError` (→ `UPSTREAM_ERROR`) so the edge speaks one error vocabulary. */
export function parseData<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new UpstreamError("BirdEye payload failed validation", {
      cause: result.error,
    });
  }
  return result.data;
}
