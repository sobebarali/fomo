import { ORPCError } from "@orpc/server";
import { protectedProcedure, publicProcedure } from "../../index";
import {
  BadRequestError,
  RateLimitError,
  UpstreamError,
} from "../../integrations/_shared/errors";
import { jupiter } from "../../integrations/jupiter";
import {
  buildTransactionInput,
  buildTransactionOutput,
  quoteInput,
  quoteOutput,
} from "./schema";

function mapUpstreamError(err: unknown): never {
  if (err instanceof RateLimitError) {
    throw new ORPCError("RATE_LIMITED");
  }
  if (err instanceof BadRequestError) {
    throw new ORPCError("BAD_REQUEST", { message: err.message });
  }
  if (err instanceof UpstreamError) {
    throw new ORPCError("UPSTREAM_ERROR");
  }
  throw err;
}

const quote = publicProcedure
  .errors({ BAD_REQUEST: {}, RATE_LIMITED: {}, UPSTREAM_ERROR: {} })
  .input(quoteInput)
  .output(quoteOutput)
  .handler(async ({ input }) => {
    try {
      return await jupiter.quote(input);
    } catch (err) {
      mapUpstreamError(err);
    }
  });

const buildTransaction = protectedProcedure
  .errors({
    BAD_REQUEST: {},
    RATE_LIMITED: {},
    UNAUTHORIZED: {},
    UPSTREAM_ERROR: {},
  })
  .input(buildTransactionInput)
  .output(buildTransactionOutput)
  .handler(async ({ input }) => {
    try {
      const { swapTransaction } = await jupiter.swapTransaction(input);
      return { swapTransaction };
    } catch (err) {
      mapUpstreamError(err);
    }
  });

export const swapRouter = { buildTransaction, quote };
