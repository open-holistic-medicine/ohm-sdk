# Hospital integration kit — Studio side

Drop-in clinical extraction for an inpatient ward EMR. Replaces a
`webkitSpeechRecognition` + regex-parser pipeline (the typical "v1
voice EMR") with OHM's multilingual STT + structured-extraction layer.

This folder ships **the Studio side**: 3 published API schemas, a
sanity-check probe, and the setup instructions below. For the **React
Native UI side** (3 drop-in screens that call these schemas), see the
sibling folder [`examples/clinical-station-rn`](../clinical-station-rn).

**Time to integrate end-to-end: ~2 working days.**

```
schemas/
  inpatient-vitals/
    sections.json                     ← paste into Builder → JSON tab
    system-prompt.md                  ← paste into Builder → Prompt tab
    schema.studio.json                ← canonical full schema (reference)
  inpatient-doctor-note/
    sections.json
    system-prompt.md
    schema.studio.json
  nurse-shift-handover/
    sections.json
    system-prompt.md
    schema.studio.json
probe.ts                              ← run after publish to verify
.env.example                          ← copy → .env, fill values
README.md                             ← this file
```

---

## Step 1 — Import the 3 schemas into Studio (3 min, hospital admin)

For each of the three folders (`inpatient-vitals`,
`inpatient-doctor-note`, `nurse-shift-handover`):

1. Sign in at [`studio.ohm.doctor`](https://studio.ohm.doctor) as an
   org admin.
2. Open your project → **+ New API** → set the slug to the folder
   name (e.g. `inpatient-vitals`) → click **Create**.
3. **Builder → JSON tab** → open
   `schemas/<slug>/schema.studio.json`, copy the whole file, paste.
   The Studio detects the full schema and auto-fills every tab —
   sections, system prompt, inputs, insights — in one action. You'll
   see a green confirmation: *"Imported full schema · N sections +
   prompt."*
4. Click **Save** → **Publish**.

That's it. Three pastes total (one per API), each does the whole
import.

After all three are published, these endpoints are live for your org:

```
POST https://api.ohm.doctor/api/studio/v1/audio/extract/inpatient-vitals
POST https://api.ohm.doctor/api/studio/v1/audio/extract/inpatient-doctor-note
POST https://api.ohm.doctor/api/studio/v1/audio/extract/nurse-shift-handover
```

> **Want different slugs?** Pick your own slug in the Create dialog
> (step 2). Update `OHM_*_SLUG` in your `.env` to match.

> **On an older Studio that doesn't auto-classify?** Paste
> `<slug>/sections.json` into Builder → JSON, then
> `<slug>/system-prompt.md` into the Prompt tab. Same end result, two
> pastes per API instead of one.

---

## Step 2 — Mint API keys (1 min)

In Studio → **Keys** tab → **+ New key**:

| Key                 | Where it lives                   | Why                                  |
|---------------------|----------------------------------|--------------------------------------|
| `ohms_test_…`       | Dev laptops, `.env.local`        | Free, doesn't bill. Use for probes.  |
| `ohms_live_…`       | Your backend secrets manager     | Production. **Never** in mobile bundle. |

Hit **Reveal** and copy the test-mode key. Save the live one
straight to your secrets manager — it's shown only once.

---

## Step 3 — Configure `.env` and run the probe (3 min)

```bash
cd examples/hospital-integration
cp .env.example .env

# Open .env and paste your ohms_test_* key into OHM_API_KEY.

npm install
npm run probe
```

Expected output (first time may take ~30s — model warm-up):

```
→ inpatient-vitals  (~4000ms)
{
  "temperature": 99.1,
  "pulse": 104,
  "respiratoryRate": 22,
  "bpSystolic": 130,
  "bpDiastolic": 85,
  "spo2": 96,
  "painScore": 4
}

→ inpatient-doctor-note  (~6000ms)
{ "content": "- Day 2 post-op …", "plan": "- Continue Augmentin …" }

→ nurse-shift-handover  (~15000ms)
{ "soapSubjective": { "markdown": "- …" }, "timeline": [ … ], "isbarr": { … } }
```

If you see `OHMAuthError` → wrong key. `OHMValidationError → "API … not
found"` → schema slug mismatch (check `OHM_*_SLUG` in `.env` vs your
Studio publish).

---

## Step 4 — Wire your backend proxy (half a day)

The mobile app must NOT carry the live key. Architecture:

```
mobile app  ──→  your backend (live key here)  ──→  OHM API
                            │
                            └──→  your hospital DB
```

Three thin endpoints to add to your existing API:

| Mobile endpoint          | What your backend does |
|--------------------------|------------------------|
| `POST /api/extract/vitals`        | Forward audio to OHM `inpatient-vitals`, persist `VitalsRecord`, return JSON |
| `POST /api/extract/doctor-note`   | Forward to OHM `inpatient-doctor-note`, persist `DoctorNote`, return JSON |
| `POST /api/extract/nurse-shift`   | Forward to OHM `nurse-shift-handover`, persist `CareShift`, return JSON |

Each one:

1. Verifies the user's session token (your existing auth).
2. Forwards the audio multipart to OHM with the live key.
3. Stores the returned structured JSON in your DB with patient + author context.
4. Returns the JSON to the mobile app.

For a **production reference** (Next.js server actions, typed-error
handling, key never leaks to the browser), see
[`examples/nextjs-server-action`](../nextjs-server-action). For a
plain Express version, see
[`examples/webhook-receiver`](../webhook-receiver) (its multipart
proxy pattern is the same shape).

---

## Step 5 — Wire the React Native screens

Three production-ready screens that match the schemas above ship in
the sibling folder:

```
examples/clinical-station-rn/
  src/screens/VitalsCaptureScreen.tsx     ← inpatient-vitals
  src/screens/DoctorNoteScreen.tsx        ← inpatient-doctor-note
  src/screens/NurseShiftScreen.tsx        ← nurse-shift-handover
```

`cd examples/clinical-station-rn` and follow its README — five steps,
takes 30 minutes the first time.

The screens use OHM's `useRecorder()` hook for the recording
lifecycle, the SDK's auto-abort on unmount, and the standard
`OHMValidationError` shape for inline field hints. Pair them with
your existing patient/ward navigation — they're drop-in components,
not a full app shell.

---

## What changes for your users

| Before                                   | After                                                                   |
|------------------------------------------|-------------------------------------------------------------------------|
| Voice only works on Chrome               | Works on iOS Safari, Android Chrome, all browsers, native iOS/Android   |
| English-only                             | 23 languages — auto-translated to English server-side                   |
| Browser-side regex parser drops fields   | OHM extraction with clinical safety priors                              |
| `parseVitalsFromTranscript()` regex      | `ohm.audio.extract({ apiSlug })` — typed JSON response                  |
| No audit trail                           | Every call gets a `requestId` for support / compliance                  |
| Free-form prose notes                    | Markdown bullet-list notes (consistent format, faster to skim)          |

---

## Verified extraction quality

All three schemas extract every field cleanly on realistic
Indian-English clinical dictation:

| Schema                        | Extraction | Latency |
|-------------------------------|------------|---------|
| `inpatient-vitals`            | 7/7        | ~4 s    |
| `inpatient-doctor-note`       | 2/2        | ~6 s    |
| `nurse-shift-handover`        | SOAP + 5-event timeline + ISBARR | ~15 s |

OHM core also ships a flatten + nest adapter for the generic
`vitals-block` field type (used by other Studio APIs that opt for the
nested `vitals.bp.{systolic,diastolic}` shape) — the extractor sees a
flat sibling shape it handles reliably, and OHM re-nests on the way
out.

---

## Support

Drop a `requestId` from any failed call in your support email and the
OHM team can triage server logs in under 5 minutes.
