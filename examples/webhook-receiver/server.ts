/**
 * OHM webhook receiver — production-ready HMAC-SHA256 verification.
 *
 * Listens on POST /ohm-events. OHM signs each event body with the
 * webhook secret and sends the hex digest in the `OHM-Signature`
 * header (also accepted: `X-OHM-Signature` for the new async-job
 * callback path). Reject anything that doesn't match.
 *
 * Use express.raw() so we get the exact bytes — re-serialising via
 * express.json() would break the HMAC (different whitespace, key order
 * after JSON.parse → JSON.stringify, etc.).
 *
 * Events handled:
 *   • job.completed         — async extraction finished
 *   • job.failed            — async extraction errored
 *   • job.cancelled         — async extraction cancelled
 *   • invocation.success    — sync extraction success (Studio webhook)
 *   • invocation.failed     — sync extraction failure (Studio webhook)
 *   • quota.warning         — org-level quota threshold crossed
 *
 * Idempotency: every signed delivery includes a unique
 * X-OHM-Delivery-Id header. Dedupe with a Redis SET or DB unique
 * constraint — OHM retries failed deliveries (5m → 30m → 2h → 5h →
 * 10h → 24h → 24h, ~3 days total).
 */
import express, { type Request, type Response } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";

const PORT = Number(process.env.PORT) || 4040;
const SECRET = process.env.OHM_WEBHOOK_SECRET || "";
if (!SECRET) {
  console.error("");
  console.error("ERROR: OHM_WEBHOOK_SECRET not set.");
  console.error("");
  console.error("  1. Mint a webhook secret in Studio → API → Settings → Webhooks → + Add.");
  console.error('  2. Add it to .env:  OHM_WEBHOOK_SECRET="whsec_xxxxxx"');
  console.error("  3. Run again: npm start");
  console.error("");
  process.exit(1);
}

const app = express();

// In-memory delivery dedupe (replace with Redis/DB in production).
// Keep only the last 1000 ids so memory doesn't grow unbounded.
const seenDeliveries = new Set<string>();
const SEEN_LIMIT = 1000;

app.post(
  "/ohm-events",
  express.raw({ type: "application/json", limit: "1mb" }),
  (req: Request, res: Response) => {
    // ── 1. Pull and parse the signature header.
    // Accept both "OHM-Signature" (Studio invocation events) and
    // "X-OHM-Signature" (async-job callbacks) — same HMAC scheme,
    // different teams shipped different header casings.
    const sigHeader =
      req.header("OHM-Signature") || req.header("X-OHM-Signature") || "";
    const [scheme, presented] = sigHeader.split("=");
    if (scheme !== "sha256" || !presented) {
      return res.status(400).send("missing/invalid signature header");
    }

    // ── 2. Recompute the digest over the EXACT raw bytes.
    const expected = createHmac("sha256", SECRET)
      .update(req.body as Buffer)
      .digest("hex");

    // ── 3. Constant-time compare. Bail on length mismatch first to
    //       avoid timingSafeEqual's length assertion crashing the proc.
    if (
      presented.length !== expected.length ||
      !timingSafeEqual(
        Buffer.from(presented, "hex"),
        Buffer.from(expected, "hex"),
      )
    ) {
      return res.status(401).send("signature mismatch");
    }

    // ── 4. Idempotency — drop duplicates so retries don't double-write.
    const deliveryId =
      req.header("X-OHM-Delivery-Id") || req.header("OHM-Delivery-Id") || "";
    if (deliveryId && seenDeliveries.has(deliveryId)) {
      return res.status(200).send("duplicate delivery — already processed");
    }
    if (deliveryId) {
      seenDeliveries.add(deliveryId);
      if (seenDeliveries.size > SEEN_LIMIT) {
        // Trim the oldest half (best-effort).
        const overflow = [...seenDeliveries].slice(0, SEEN_LIMIT / 2);
        for (const id of overflow) seenDeliveries.delete(id);
      }
    }

    // ── 5. Only now is it safe to parse + dispatch.
    let event: KnownEvent;
    try {
      event = JSON.parse((req.body as Buffer).toString("utf8")) as KnownEvent;
    } catch {
      return res.status(400).send("body is not valid JSON");
    }

    handleEvent(event, deliveryId);
    // 2xx as fast as possible — heavy work happens off the response path.
    res.status(204).end();
  },
);

app.get("/health", (_req, res) => res.json({ ok: true, port: PORT }));

app.listen(PORT, () => {
  console.log("");
  console.log(`✓ OHM webhook receiver listening on :${PORT}`);
  console.log(`  POST   http://localhost:${PORT}/ohm-events`);
  console.log(`  GET    http://localhost:${PORT}/health`);
  console.log("");
  console.log("  Configure the webhook URL in Studio → API → Settings → Webhooks.");
  console.log("  For local dev, expose this server with ngrok / cloudflared.");
  console.log("");
});

// ─── Event types ──────────────────────────────────────────────────────

type KnownEvent =
  | { event: "job.completed"; jobId: string; apiSlug?: string; transcript?: string; data?: Record<string, unknown>; audioSeconds?: number; totalTokens?: number; createdAt: string; completedAt: string }
  | { event: "job.failed"; jobId: string; apiSlug?: string; errorCode?: string; errorMessage?: string; createdAt: string; completedAt: string }
  | { event: "job.cancelled"; jobId: string; apiSlug?: string; createdAt: string; completedAt: string }
  | { event: "invocation.success"; organizationId: string; projectId: string; apiId: string; apiSlug: string; timestamp: string; data: Record<string, unknown> }
  | { event: "invocation.failed"; organizationId: string; projectId: string; apiId: string; apiSlug: string; timestamp: string; data: Record<string, unknown> }
  | { event: "quota.warning"; organizationId: string; timestamp: string; data: Record<string, unknown> }
  | { event: string; [k: string]: unknown };

// ─── Dispatcher ───────────────────────────────────────────────────────

/**
 * Replace this stub with whatever your hospital pipeline does:
 *   - persist the result to your audit DB
 *   - update the patient's chart
 *   - notify the doctor on a failed extraction
 *   - tick a Prometheus counter
 *
 * Every branch logs the salient fields so you can see what's coming in
 * during local dev. In production, swap console.log for your logger.
 */
function handleEvent(event: KnownEvent, deliveryId: string) {
  const stamp = new Date().toISOString();
  const tag = `[${stamp}] ${deliveryId ? `<${deliveryId}> ` : ""}`;

  switch (event.event) {
    case "job.completed": {
      const e = event as Extract<KnownEvent, { event: "job.completed" }>;
      console.log(
        `${tag}✓ job.completed  ${e.jobId}  apiSlug=${e.apiSlug ?? "?"}  audio=${e.audioSeconds ?? "?"}s  tokens=${e.totalTokens ?? "?"}`,
      );
      if (e.data) {
        console.log(
          `${tag}  data keys: ${Object.keys(e.data).join(", ") || "(empty)"}`,
        );
      }
      // → persist e.data to your audit DB / push to your chart UI
      return;
    }
    case "job.failed": {
      const e = event as Extract<KnownEvent, { event: "job.failed" }>;
      console.log(
        `${tag}✗ job.failed     ${e.jobId}  apiSlug=${e.apiSlug ?? "?"}  err=${e.errorCode ?? "?"}: ${e.errorMessage ?? ""}`,
      );
      // → mark the visit as failed; surface to the doctor for a re-record
      return;
    }
    case "job.cancelled": {
      const e = event as Extract<KnownEvent, { event: "job.cancelled" }>;
      console.log(`${tag}— job.cancelled  ${e.jobId}  apiSlug=${e.apiSlug ?? "?"}`);
      return;
    }
    case "invocation.success": {
      const e = event as Extract<KnownEvent, { event: "invocation.success" }>;
      console.log(
        `${tag}✓ invocation.success  ${e.apiSlug}  keys=${Object.keys(e.data ?? {}).join(", ")}`,
      );
      return;
    }
    case "invocation.failed": {
      const e = event as Extract<KnownEvent, { event: "invocation.failed" }>;
      console.log(`${tag}✗ invocation.failed   ${e.apiSlug}`, e.data);
      return;
    }
    case "quota.warning": {
      console.log(`${tag}⚠ quota.warning`, event.data);
      return;
    }
    default:
      console.log(`${tag}? unknown event: ${event.event}`);
  }
}
