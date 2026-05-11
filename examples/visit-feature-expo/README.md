# OHM Visit · React Native (Expo) — full visit-feature example

The canonical end-to-end example: a real-time clinical visit recorder.
Three screens, AsyncStorage persistence, navigation, the modern
`useRecorder` hook with auto-extract, speaker-mode + duration cap, and
full structured JSON rendering.

This is what you ship in a hospital's mobile EMR — minus their auth +
their server. Swap `src/lib/storage.ts` for your backend and you have
your own visit feature.

> Mirrors the [docs cookbook](https://docs.ohm.doctor/cookbook/visit-feature)
> walkthrough. Read the cookbook first for the architecture; this repo
> is the runnable form of it.

## What it shows

| Screen | What it demonstrates |
|---|---|
| **VisitList** | Past visits loaded from AsyncStorage. Newest first. Long-press to delete. Tap "+ New visit" to start. |
| **NewVisit** | Patient name + MRN form, **doctor / doctor+patient** picker, big record button with live VU meter + duration, `useRecorder({ apiSlug, speakerMode, extractInputs })` doing transcription **and** structured-JSON extraction in one call. |
| **VisitDetail** | A saved visit: patient meta, full transcript, the structured JSON the SDK extracted (vitals, diagnoses, medications, etc.). |

## Real-time use cases this covers

- Doctor opens app → sees the day's prior visits
- Taps "+ New visit" → enters the patient → picks "Doctor + Patient" mode
- Records a 5-minute consult → silence for 8s auto-stops → SDK transcribes
  + extracts in one round-trip → JSON is shown in-screen
- Doctor reviews the data → taps "Save to local EMR" → visit is
  persisted to AsyncStorage → returns to the list
- Tablet reboots → visits survive (real persistence, not memory)
- Nurse-station dictation → switch to "Doctor only" mode, single-speaker
  preset

## End-to-end flow (what the code actually does)

```
User opens app
   │
   ▼
VisitListScreen ──── lists from AsyncStorage ──── tap row ──► VisitDetailScreen
   │
   │ tap "+ New visit"
   ▼
NewVisitScreen
   │
   │ fill patient name + MRN, pick speaker mode
   │
   │ tap RECORD
   ▼
useRecorder({ audio: Audio, apiSlug, speakerMode, extractInputs: { patientId } })
   │
   │ Expo Audio handles mic permission, iOS audio session,
   │ recording (16 kHz mono AAC clinical preset), VU metering.
   │
   │ tap STOP   (or 8s of silence auto-stops, or 15-min cap)
   ▼
SDK calls POST /api/studio/v1/audio/extract/<apiSlug>
   ├── multipart audio → OHM STT (23 Indian languages, auto-detect)
   ├── transcript → OHM extraction with medical primitives → typed JSON
   └── returns { transcript, data: ExtractedVisit }
   │
   │ rendered live in NewVisitScreen
   ▼
"Save to local EMR" → AsyncStorage.setItem
   │
   ▼
goBack() → VisitListScreen reloads, new visit appears
```

## Build & run

```bash
# 1 — Expo project, fresh install
cd examples/visit-feature-expo
npm install

# 2 — get a TEST key (live keys are blocked in RN bundles)
# https://studio.ohm.doctor → Keys → New key → Test mode
cp .env.example .env
# edit .env: set EXPO_PUBLIC_OHM_TEST_KEY and EXPO_PUBLIC_OHM_API_SLUG

# 3 — start
npm start

# 4 — run on device:
#   • Scan the QR code with Expo Go on iOS / Android, or
#   • Press i / a in the terminal to launch a simulator
```

## Required setup in Studio (one-time)

1. Sign in to https://studio.ohm.doctor
2. **+ New project** → name it (e.g. "Visit demo")
3. **+ New API** → clone the **OPD Prescription** starter
4. Click **Publish**
5. Copy the slug (e.g. `opd-clinic`) into `.env` as `EXPO_PUBLIC_OHM_API_SLUG`

That's it — the app uses the auto-minted Playground key for transcription
and your published API for extraction.

## Project layout

```
visit-feature-expo/
├── App.tsx                      # OhmProvider + NavigationContainer + 3 screens
├── package.json                 # Expo + ohm SDK + react-navigation + AsyncStorage
├── app.json                     # mic permission, bundle id
├── tsconfig.json
├── babel.config.js
├── .env.example
└── src/
    ├── lib/
    │   ├── types.ts             # ExtractedVisit + SavedVisit shapes
    │   └── storage.ts           # listVisits / saveVisit / deleteVisit (AsyncStorage)
    └── screens/
        ├── VisitListScreen.tsx  # Home: past visits, "New visit" button
        ├── NewVisitScreen.tsx   # Patient form + Recorder + auto-extract + Save
        └── VisitDetailScreen.tsx # View a saved visit (transcript + JSON)
```

## Replacing AsyncStorage with your real backend

`src/lib/storage.ts` is the only file you change. Keep the function
signatures (`listVisits()`, `saveVisit(v)`, `deleteVisit(id)`) and swap
the AsyncStorage reads/writes for your REST/GraphQL calls. The screens
don't need to change.

```ts
// Example replacement:
import { fetchAuthed } from "@/your-backend";

export async function listVisits() {
  const r = await fetchAuthed("/api/visits");
  return r.json();
}

export async function saveVisit(v: SavedVisit) {
  await fetchAuthed("/api/visits", {
    method: "POST",
    body: JSON.stringify(v),
  });
}
```

## Going to production

- **Never bundle a live key.** The SDK refuses `ohms_live_*` in RN bundles
  unless `acknowledgeBundledKey: true` is set (only used here for the
  demo). In production, the mobile app calls *your* backend with a session
  token; your backend forwards to OHM with the live key. See
  [docs.ohm.doctor/security/rn-key-handling](https://docs.ohm.doctor/security/rn-key-handling).
- Wire `useNetworkStatus()` (web equivalent) on the doctor's tablet; for
  RN, gate the RECORD button behind a network check.
- Render the structured JSON into proper EMR widgets — vital-sign gauges,
  prescription rows, allergy badges — instead of the raw `<pre>` view.
- Add per-doctor sign-in (mock auth) before allowing visits to save.

## Reference

- [Cookbook: build a Visit feature](https://docs.ohm.doctor/cookbook/visit-feature) — the prose version of this code
- [React Native SDK reference](https://docs.ohm.doctor/sdk/react-native)
- [`useRecorder` hook reference](https://docs.ohm.doctor/sdk/recorder)
- [Speaker mode](https://docs.ohm.doctor/sdk/recorder#speaker-mode)
- [Security · RN key handling](https://docs.ohm.doctor/security/rn-key-handling)
