import { publicProcedure } from "../../index";
import {
  RateLimitError,
  UpstreamError,
} from "../../integrations/_shared/errors";
import { market } from "../../integrations/market";
import { routerError } from "../_shared/errors";
import { decodeCursor, paginate } from "../_shared/pagination";
import { getInput, tokenDetail, trendingInput, trendingOutput } from "./schema";

// One upstream failure → one taxonomy code: 429 → RATE_LIMITED, anything else → UPSTREAM_ERROR.
// Re-throws anything not from the integration (e.g. a NOT_FOUND we raised), never leaking a raw 500.
function mapUpstreamError(err: unknown): never {
  if (err instanceof RateLimitError) {
    throw routerError("RATE_LIMITED");
  }
  if (err instanceof UpstreamError) {
    throw routerError("UPSTREAM_ERROR");
  }
  throw err;
}

const trending = publicProcedure
  .errors({ RATE_LIMITED: {}, UPSTREAM_ERROR: {} })
  .input(trendingInput)
  .output(trendingOutput)
  .handler(async ({ input }) => {
    const offset = decodeCursor(input.cursor);
    try {
      const items = await market.trending({
        sort: input.sort,
        limit: input.limit,
        offset,
      });
      return paginate(items, input.limit, offset);
    } catch (err) {
      mapUpstreamError(err);
    }
  });

const get = publicProcedure
  .errors({
    BAD_REQUEST: {},
    NOT_FOUND: {},
    RATE_LIMITED: {},
    UPSTREAM_ERROR: {},
  })
  .input(getInput)
  .output(tokenDetail)
  .handler(async ({ input }) => {
    try {
      const token = await market.token({ address: input.address });
      if (!token) {
        throw routerError("NOT_FOUND");
      }
      return token;
    } catch (err) {
      mapUpstreamError(err);
    }
  });

export const tokensRouter = { get, trending };
