# OHM Webhook Receiver — Express + HMAC-SHA256

Production-ready receiver for OHM webhook events. Verifies the HMAC
signature, dedupes retries via `X-OHM-Delivery-Id`, and dispatches
**six** event types — both async-job callbacks and Studio invocation
events.

```
job.completed       async extraction finished       → persist result
job.failed          async extraction errored        → mark visit failed
job.cancelled       async extraction cancelled      → log
invocation.success  sync extraction success         → audit log
invocation.failed   sync extraction failure         → notify clinician
quota.warning       org-level quota threshold       → email admin
```

---

## Step 1 — Install

```bash
cd examples/webhook-receiver
npm install
```

## Step 2 — Set your secret

```bash
cp .env.example .env
# Edit .env:
#   OHM_WEBHOOK_SECRET=whsec_xxxxxxxx
```

The secret is shown **once** when you create the webhook in Studio:

> Studio → API → Settings → Webhooks → + Add → copy `whsec_*`.

For async-job callbacks, the same secret is used. Set the webhook URL
on the job at create time:
`ohm.audio.jobs.create({ ..., webhookUrl: 'https://your-host/ohm-events' })`.

## Step 3 — Run

```bash
npm start
# → ✓ OHM webhook receiver listening on :4040
```

For local development, expose port 4040 publicly with [ngrok](https://ngrok.com)
or [Cloudflare Tunnel](https://www.cloudflare.com/products/tunnel/) so
OHM can POST to it. Set the resulting public URL in Studio.

---

## Verify it locally (no ngrok needed)

In one terminal:

```bash
npm start
```

In another:

```bash
BODY='{"event":"job.completed","jobId":"job_abc","apiSlug":"opd-clinic","createdAt":"2026-05-11T10:00:00Z","completedAt":"2026-05-11T10:00:30Z","totalTokens":420,"audioSeconds":35,"data":{"diagnosis":"viral fever"}}'
SECRET="$(grep OHM_WEBHOOK_SECRET .env | cut -d= -f2)"
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | awk '{print $NF}')

curl -i -X POST http://localhost:4040/ohm-events \
  -H "Content-Type: application/json" \
  -H "X-OHM-Signature: sha256=$SIG" \
  -H "X-OHM-Delivery-Id: dev-$(date +%s)" \
  -d "$BODY"
# → 204 No Content; server logs "✓ job.completed job_abc apiSlug=opd-clinic …"
```

Tamper with `$BODY` or `$SIG` → server returns **401 signature
mismatch**. Send the same `X-OHM-Delivery-Id` twice → the second one
returns **200 duplicate delivery — already processed**.

---

## What the receiver guarantees

| Guarantee | How |
|---|---|
| **Bytes match what OHM signed** | `express.raw()` keeps the body as a `Buffer` instead of letting `express.json()` re-serialise. |
| **Constant-time signature comparison** | `crypto.timingSafeEqual` after a length-equality check (avoids the assertion crash on mismatched lengths). |
| **Replay protection** | `X-OHM-Delivery-Id` is dedupe'd in an in-memory `Set` (last 1000 ids). Replace with Redis/DB for production. |
| **Two-header tolerance** | Accepts both `OHM-Signature` (legacy invocation events) and `X-OHM-Signature` (async callbacks). |
| **Fast 2xx** | Heavy work happens after the response — OHM only treats 2xx as success and won't retry. |

---

## Going to production

- **TLS**: terminate with Caddy / nginx / Cloud Run / fly.io.
- **Persistent dedupe**: replace the in-memory `seenDeliveries` set
  with Redis SET or a unique constraint on a `webhook_deliveries` row.
- **Retry policy**: OHM retries failed deliveries Stripe-style:
  `5 m → 30 m → 2 h → 5 h → 10 h → 24 h → 24 h` (~3 days). Idempotency
  key handling is mandatory.
- **Timestamp guard**: optionally reject events older than 5 minutes by
  parsing `event.completedAt` / `event.timestamp` and comparing to
  `Date.now()` — a basic replay attack defence.

---

## Common errors

| Symptom | Reason | Fix |
|---|---|---|
| Process exits with `OHM_WEBHOOK_SECRET not set` | `.env` not loaded | `cp .env.example .env`, fill secret, `npm start` |
| `401 signature mismatch` on every request | Secret in `.env` ≠ Studio | Re-copy the webhook secret from Studio |
| `400 missing/invalid signature header` | OHM requests have a header; cURL test typo'd it | Header must read `X-OHM-Signature: sha256=<hex>` (or `OHM-Signature:`) |
| `200 duplicate delivery` on legitimate events | Same delivery id used twice | OHM auto-generates a fresh `X-OHM-Delivery-Id` per delivery; don't override |

---

## See also

- `examples/clinical-station-rn` — Async tab uses webhook callback in production mode
- `examples/node-cli async` — submit jobs from the CLI; verify your webhook fires
- [docs.ohm.doctor/sdk/async-extraction](https://docs.ohm.doctor/sdk/async-extraction) — full async docs
