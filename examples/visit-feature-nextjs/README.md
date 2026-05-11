# OHM Visit · Next.js — full visit-feature example (web)

Web parallel to [`visit-feature-expo`](../visit-feature-expo). Same three
screens, same flow, same backend. Localhost-portable, browser
`MediaRecorder`-driven, server-action-protected key.

## What it shows

| Page | What it demonstrates |
|---|---|
| **`/`** (visit list) | Past visits from `localStorage`. Newest first. Per-row delete. "+ New visit" button. |
| **`/new`** (new visit) | Patient name + MRN form, **doctor / doctor+patient** picker (driven by `SPEAKER_MODES` from the SDK), browser `Recorder` with VU meter + 8s silence auto-stop + 15-min cap, server action calling `ohm.audio.extract`, save to localStorage, jump to detail. |
| **`/visit/[id]`** | Saved visit: meta, full transcript, structured JSON. |

## End-to-end flow

```
Browser                                  Server (Next.js)
────────                                 ──────────────────
/page.tsx ── localStorage ── visit list
   │
   │ click "+ New visit"
   ▼
/new/page.tsx
   ▼
fill patient + speaker mode
   ▼
Recorder.start() (mic + VU + duration)
   ▼
STOP → blob ── multipart POST ──►  app/actions.ts ('use server')
                                      │
                                      ▼
                                   OHM.audio.extract({ apiSlug, file })
                                      │  (live key stays here)
                                      ▼
                                   OHM STT + extraction
                                      │
                                      ▼
                                   { transcript, data }  ◄── returned
   ▼
saveVisit() → localStorage
   ▼
router.push(`/visit/${id}`)
```

## Build & run

```bash
cd examples/visit-feature-nextjs
npm install

cp .env.local.example .env.local
# edit .env.local — paste your live OHM_API_KEY, set OHM_API_SLUG

npm run dev
# open http://localhost:3030
```

## Env

| Variable | Default | What it is |
|---|---|---|
| `OHM_API_KEY` | (required) | `ohms_live_*` — stays server-side |
| `OHM_BASE_URL` | `https://api.ohm.doctor` | Override only if self-hosting |
| `OHM_API_SLUG` | `opd-clinic` | Slug of a published API in your project |

## Going to production

- The page bundles use the public `Recorder` from `@ohm_studio/sdk` —
  no key in the client. Only the server action holds the live key.
  Don't change this layout.
- Replace `lib/storage.ts` with calls to your EMR backend
  (REST/GraphQL). The function signatures match the Expo demo so
  hospital code can be shared between web + mobile.
- Consider streaming via `ohm.audio.extract.stream({ ... })` — see
  [`examples/streaming`](../streaming). Halves perceived latency by
  rendering the transcript before structured JSON arrives.
- Add `usePendingRecordings()` from `@ohm_studio/sdk/react` to surface
  unsent recordings on next mount — handles tab-crash recovery.

## Reference

- [Cookbook: build a Visit feature](https://docs.ohm.doctor/cookbook/visit-feature)
- [JavaScript SDK reference](https://docs.ohm.doctor/sdk/javascript)
- [Browser Recorder](https://docs.ohm.doctor/sdk/recorder)
- [Mobile twin](../visit-feature-expo)
