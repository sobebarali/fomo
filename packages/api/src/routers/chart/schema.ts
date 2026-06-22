import { z } from "zod";
import { solanaMint } from "../_shared/schema";

/**
 * Named input + output view for the `chart` router. `candle` mirrors the `Candle` view type
 * (`../../integrations/birdeye/schema`): the handler returns those typed values into `.output(...)`,
 * so a renamed/added BirdEye field fails `check-types` and a dropped field fails the happy-path test.
 */
export const candlesInput = z.object({
  address: solanaMint,
  interval: z.enum(["1m", "5m", "15m", "1H", "4H", "1D", "1W"]).default("15m"),
  from: z.number().int().optional(),
  to: z.number().int().optional(),
});

export const candle = z.object({
  time: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
});

export const candlesOutput = z.object({
  candles: z.array(candle),
});
