# OHM SDK · Node CLI

Showcase every server-side SDK surface from a single CLI. Intended as
both a working tool you can use today (`npm start summarize file.txt`)
and a reference for wiring OHM into your own backend scripts.

---

## What this CLI does

```
summarize  <file.txt>             — text → summary (4 styles)
extract    <file.txt>  --apiSlug  — text → structured JSON
transcribe <file.audio>           — audio → English transcript
async      <file.audio> --apiSlug — long audio (extractAsync — submit + poll)
list                              — apis.list()  (every published API on this key)
show       <slug>                 — apis.get(slug)  (schema + prompt + inputs)
```

Every subcommand uses **typed error catching** — `OHMAuthError`,
`OHMValidationError`, `OHMNotFoundError`, `OHMRateLimitError`,
`OHMTimeoutError`, `OHMNetworkError`, `OHMServerError`. You'll never
get a raw stack trace.

---

## Step 1 — Install

```bash
cd examples/node-cli
npm install
```

## Step 2 — Set your key

```bash
cp .env.example .env
# Edit .env and replace the placeholder:
#   OHM_API_KEY=ohms_test_xxxxxxxxxxxxxxxxxxxx
```

Mint a key in **Studio → Keys → New key**. Test keys (`ohms_test_*`)
work everywhere; for production, use a live key on your backend only.

## Step 3 — Try each subcommand

```bash
# Patient-friendly summary
npm start summarize ./consult.txt

# Different summary style
npm start summarize ./consult.txt --style handover

# Structured extraction (replace opd-clinic with your slug)
npm start extract ./consult.txt --apiSlug opd-clinic

# Audio → text
npm start transcribe ./recording.m4a

# Long audio → JSON via async job
npm start async ./long-recording.m4a --apiSlug opd-clinic

# What APIs are on this key?
npm start list

# Inspect one API's schema
npm start show opd-clinic
```

The script never crashes on missing config — if you forget to set
`OHM_API_KEY` it prints a 3-step fix.

---

## Common errors

| What you see | What it means | Fix |
|---|---|---|
| `OHM_API_KEY not set` | `.env` not loaded | `cp .env.example .env` and edit |
| `[ohm] auth failed` | Key is bad/expired | Mint a fresh key in Studio |
| `[ohm] not found` | The slug you passed isn't published | Run `npm start list` to see real slugs |
| `[ohm] rate limited` | Too many requests | Wait `retryAfterSec`, then retry |
| `[ohm] request timed out` | Audio too long for sync | Use `npm start async ...` instead |

---

## See also

- `examples/nextjs-server-action` — same `audio.extract` call from a server action
- `examples/streaming` — `audio.extract.stream` with an SSE proxy
- `examples/webhook-receiver` — receive async-job callbacks with HMAC verification
- [docs.ohm.doctor/sdk/cli](https://docs.ohm.doctor/sdk/cli) — Studio CLI for typed `data` codegen
