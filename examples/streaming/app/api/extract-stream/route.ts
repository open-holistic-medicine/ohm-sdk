import { OHM } from "@ohm_studio/sdk";
import type { NextRequest } from "next/server";

const apiKey = process.env.OHM_API_KEY;
if (!apiKey) {
  console.error(
    "[ohm] OHM_API_KEY not set. Run `cp .env.local.example .env.local` and edit it.",
  );
}
const ohm = apiKey
  ? new OHM({
      apiKey,
      baseUrl: process.env.OHM_BASE_URL || "https://api.ohm.doctor",
    })
  : null;
const API_SLUG = process.env.OHM_API_SLUG || "opd-clinic";

export const runtime = "nodejs";

/**
 * Server-side proxy: receives multipart audio from the browser and
 * forwards to OHM's streaming endpoint, re-emitting the SSE chunks
 * line-by-line. Live key stays here — never bundled.
 */
export async function POST(req: NextRequest) {
  if (!ohm) {
    return new Response(
      `data: ${JSON.stringify({ type: "error", message: "Server is not configured. Set OHM_API_KEY in .env.local." })}\n\n`,
      { status: 503, headers: { "Content-Type": "text/event-stream" } },
    );
  }
  const fd = await req.formData();
  const file = fd.get("audio");
  if (!(file instanceof Blob)) {
    return new Response("audio missing", { status: 400 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        const iter = ohm.audio.extractStream({ apiSlug: API_SLUG, file });
        for await (const chunk of iter) {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "stream failed";
        controller.enqueue(
          enc.encode(
            `data: ${JSON.stringify({ type: "error", message: msg })}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
