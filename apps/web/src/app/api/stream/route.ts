import { appRouter } from "@fomo/api/routers/index";
import { db } from "@fomo/db";
import { createRouterClient } from "@orpc/server";
import type { NextRequest } from "next/server";

import { subscribe } from "@/server/sse-hub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 15_000;
const encoder = new TextEncoder();
// Railway's edge proxy buffers small responses; a ~2KB comment on connect pushes past its threshold
// so events flush immediately (standard SSE-behind-a-proxy workaround).
const PADDING = `:${" ".repeat(2048)}\n\n`;

function frame(channel: string, data: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify({ channel, data })}\n\n`);
}

// Public market channels only (no auth). `address` is optional — without it you still get `trending`.
export function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address") ?? undefined;
  const channels = [
    "trending",
    ...(address ? [`token:${address}`, `trades:${address}`] : []),
  ];

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let open = true;
      const safeEnqueue = (chunk: Uint8Array) => {
        if (open) {
          controller.enqueue(chunk);
        }
      };

      safeEnqueue(encoder.encode(PADDING));
      safeEnqueue(encoder.encode(": connected\n\n"));

      const unsubscribe = subscribe(channels, (channel, data) =>
        safeEnqueue(frame(channel, data))
      );

      // Warm start: push the current cached values immediately so the client renders without waiting
      // a full poll interval. Reads hit the shared SWR cache (in-process), so this is cheap.
      const api = createRouterClient(appRouter, {
        context: { db, auth: null, session: null },
      });
      api.tokens
        .trending({ limit: 30, sort: "trending" })
        .then((data) => safeEnqueue(frame("trending", data)))
        .catch(() => undefined);
      if (address) {
        api.tokens
          .get({ address })
          .then((data) => safeEnqueue(frame(`token:${address}`, data)))
          .catch(() => undefined);
        api.trades
          .recent({ address, limit: 30 })
          .then((data) => safeEnqueue(frame(`trades:${address}`, data)))
          .catch(() => undefined);
      }

      // Keep the connection alive through Railway's proxy.
      const heartbeat = setInterval(
        () => safeEnqueue(encoder.encode(": ping\n\n")),
        HEARTBEAT_MS
      );

      req.signal.addEventListener("abort", () => {
        open = false;
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      // Hint to disable proxy/Next response buffering for this stream.
      "x-accel-buffering": "no",
    },
  });
}
