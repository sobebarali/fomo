import { ORPCError } from "@orpc/server";

type RouterErrorCode =
  | "BAD_REQUEST"
  | "CONFLICT"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "UNAUTHORIZED"
  | "UPSTREAM_ERROR";

const STATUS_BY_CODE = {
  BAD_REQUEST: 400,
  CONFLICT: 409,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  UNAUTHORIZED: 401,
  UPSTREAM_ERROR: 502,
} as const satisfies Record<RouterErrorCode, number>;

export function routerError(
  code: RouterErrorCode,
  options: { message?: string } = {}
): ORPCError<RouterErrorCode, undefined> {
  return new ORPCError(code, {
    ...options,
    status: STATUS_BY_CODE[code],
  });
}
