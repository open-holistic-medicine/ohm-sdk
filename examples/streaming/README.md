# OHM SDK · Streaming (Next.js)

Demo of `ohm.audio.extractStream()` — the latency-optimised pattern
where the **transcript renders before the structured JSON arrives**.

```
RECORD ──► STT done       ← transcript card appears (~1–2 s)
              ↓
         extraction done  ← structured JSON card appears (~2–4 s later)
              ↓
              done
```

For clinical UIs this halves perceived latency: the doctor reads the
transcript while the LLM is still thinking about the structure.

---

## Step 1 — Install

```bash
cd examples/streaming
npm install
```

## Step 2 — Set your key

```bash
cp .env.local.example .env.local
# Edit .env.local:
#   OHM_API_KEY=ohms_test_xxxxxxxx     # live keys are SAFE here — server-only
#   OHM_API_SLUG=opd-clinic            # any published Studio slug
```

`.env.local` is server-side; the live key never reaches the browser.

## Step 3 — Run

```bash
npm run dev
# → open http://localhost:3040
```

If `OHM_API_KEY` isn't set, the SSE stream replies with one
`data: { type: "error", message: "Server is not configured…" }` event
instead of crashing.

---

## What the demo shows

| Layer | Code |
|---|---|
| Browser recorder | `app/page.tsx` — uses `Recorder` from `@ohm_studio/sdk` (8 s silence auto-stop, VU meter) |
| Browser → server | Multipart `POST /api/extract-stream` |
| Server → OHM | `app/api/extract-stream/route.ts` calls `ohm.audio.extractStream({...})` and pipes the `AsyncIterable` out as SSE |
| Server → browser | Plain Server-Sent Events, parsed with `ReadableStream.getReader()` |
| UI | Two-stage rendering — transcript card first, JSON card second |

---

## Common errors

| Symptom | What it means | Fix |
|---|---|---|
| `Server is not configured…` event | `OHM_API_KEY` missing | `cp .env.local.example .env.local` and edit |
| Records but never streams | Browser blocking mic | Allow mic permission in browser settings |
| Stream cuts off at "transcript" stage | Extraction failed silently | Check the Next.js server console for the error |
| `404` on `/api/extract-stream` | Cached build | Delete `.next` and re-run `npm run dev` |

---

## See also

- `examples/nextjs-server-action` — same proxy pattern, sync (one round-trip) instead of streaming
- `examples/clinical-station-rn` — RN demo with streaming + sync + async modes
- [docs.ohm.doctor/sdk/streaming](https://docs.ohm.doctor/sdk/streaming)
- [docs.ohm.doctor/sdk/api-reference](https://docs.ohm.doctor/sdk/api-reference)
