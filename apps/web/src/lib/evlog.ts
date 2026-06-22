import { createEvlog } from "evlog/next";
import { defineNodeInstrumentation } from "evlog/next/instrumentation";

export const { withEvlog, useLogger, log, createError } = createEvlog({
  service: "fomo-web",
});

export const { register, onRequestError } = defineNodeInstrumentation({
  service: "fomo-web",
});
