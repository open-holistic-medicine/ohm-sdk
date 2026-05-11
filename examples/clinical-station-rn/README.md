# Clinical Station — React Native demo of the OHM SDK

Production-grade Expo app that exercises **every feature** of
`@ohm_studio/sdk-react-native@0.10.x` — the latest release. Use it as:

- a **demo to run** in 5 minutes (test key only, zero backend);
- a **reference codebase** when wiring OHM into your own RN app — every
  pattern below is copy-paste-ready.

---

## What this demo covers (every SDK feature, live)

| Tab | What you see | SDK surface exercised |
|---|---|---|
| **Home** | Patient header → Vitals · Doctor note · Shift handover | `useRecorder({ apiSlug, audio, silenceAutoStop, maxDurationMs, extractInputs })`, auto-extract via `<OhmProvider>`, `r.level / r.transcript / r.data / r.error / r.extractError` |
| **Async** | Long recording, polling **OR** webhook callback, upload progress, cancel | `ohm.audio.jobs.create`, `.get`, `.poll`, `.cancel`, `.extractAsync`, `onProgress`, `idempotencyKey`, `signal` |
| **Catalog** | Pull `apis.list()` → tap a row → `apis.get(slug)` detail + copy-paste snippet | `ohm.apis.list`, `ohm.apis.get` |
| **Tools → Text** | Paste a transcript → structured JSON | `ohm.extract({ apiSlug, text })` |
| **Tools → Summary** | 4 styles: patient · handover · executive · progress-note | `ohm.summarize({ text, style })` |
| **Tools → Errors** | One button per typed error class — `OHMAuthError`, `OHMValidationError`, `OHMNotFoundError`, `OHMTimeoutError`, `OHMNetworkError`, `OHMAbortError` (+ `OHMRateLimitError`, `OHMServerError`, `OHMQuotaExceededError`, `OHMConfigError` documented) | All 10 typed error classes from `@ohm_studio/sdk-core`, plus `restoreTokens()` PHI helper round-trip |
| **Tools → Audit** | Compliance-grade "every extraction touching this patient" search | `ohm.invocations.searchByPatient({ patientHash, sinceDays })` |
| **Tools → Queue** | Offline-first: enqueue, list pending, flush when online | `OhmQueue`, `makeAsyncStorageAdapter` |
| **Tools → Lang** | All 23 supported languages + 2 speaker modes | `SUPPORTED_LANGUAGES`, `SPEAKER_MODES` |

The connectivity banner at the top of the screen uses `expo-network` to
warn when the device is offline. The `<OhmProvider>` and `MicButton`
components are reused across every recording flow.

---

## Step 1 — Get the demo running (5 min, even if you've never touched RN)

You need [Node 18+](https://nodejs.org), Expo (auto-installed), and the
**Expo Go** app on a phone or a working iOS simulator / Android
emulator.

### 1a. Install

```bash
cd examples/clinical-station-rn
npm install
```

### 1b. Add a test-mode key

```bash
cp .env.example .env
```

Open `.env` in your editor. The only line you **must** edit is the API
key:

```bash
EXPO_PUBLIC_OHM_API_KEY=ohms_test_xxxxxxxxxxxxxxxxxxxx
```

Mint a test-mode key in Studio: **Keys tab → New key → Reveal**. Copy
the `ohms_test_*` value. Live keys (`ohms_live_*`) are **rejected** in
React Native bundles by default — see *Step 4 — Going to production*
for the proxy pattern.

### 1c. Start

```bash
npx expo start --clear
```

- Press `i` for the iOS simulator, `a` for an Android emulator.
- Or scan the QR code with the **Expo Go** app on your phone.

You should see the Home tab with a patient card and three capture
buttons. If you see a *Set up your OHM key* screen instead, your `.env`
is empty — go back to step 1b.

---

## Step 2 — Try every flow (works without any backend)

| Tab | Try this |
|---|---|
| **Home → Record vitals** | Tap the mic, say *"Temp 99 point 1, pulse 92, RR 18, BP 130 over 85, SpO2 97 on room air, pain 3 out of 10."* Stop. Watch the form auto-fill. |
| **Home → Add doctor note** | Speak observations + plan. The screen splits them into two Markdown fields automatically. |
| **Home → Submit shift handover** | Walk through the SOAP / timeline / ISBARR template. One dictation builds three structures. |
| **Async** | Switch to "Polling" mode (default). Record a long chunk. Watch upload %, then status flip QUEUED → PROCESSING → COMPLETED. Tap "Cancel job" mid-poll to verify cancel works. |
| **Async → Webhook** | Set `EXPO_PUBLIC_OHM_WEBHOOK_URL` in `.env`. The device fires-and-forgets; your backend receives a signed POST. |
| **Catalog** | Pull-to-refresh, tap any row to see the schema, version, and a copy-paste RN snippet. |
| **Tools → Text** | Paste any clinical note, run, see the JSON. |
| **Tools → Summary** | Same source text, four different summary styles. |
| **Tools → Errors** | Tap each row to trigger that error class on demand — verify your try/catch ladder without waiting for a real failure. |
| **Tools → Audit** | Type any patient identifier — the screen hashes it client-side and searches `/invocations`. |
| **Tools → Queue** | "Enqueue demo entry" → "flush()" — see the offline-replay loop end-to-end. |

---

## Step 3 — Wire it into your own app

You can use the entire demo as a starter, or **copy individual pieces
into an existing RN app**. Here's how each piece slots in.

### 3a. The OHM client (must, every other piece imports this)

`src/lib/ohm-client.ts`:

```ts
import { OHM } from "@ohm_studio/sdk-react-native";

export const ohm = new OHM({
  apiKey: process.env.EXPO_PUBLIC_OHM_API_KEY!,
  baseUrl: process.env.EXPO_PUBLIC_OHM_BASE_URL ?? "https://api.ohm.doctor",
});
```

Wrap your app once near the root:

```tsx
import { OhmProvider } from "@ohm_studio/sdk-react-native/react";
import { ohm } from "./lib/ohm-client";

<OhmProvider client={ohm}>
  <YourApp />
</OhmProvider>
```

### 3b. Voice → structured JSON in one screen (`useRecorder`)

The fastest way to build a "voice form" — the hook handles permissions,
recording, level metering, auto-stop, AND the post-stop extract call.

```tsx
import { Audio } from "expo-av";
import { useRecorder } from "@ohm_studio/sdk-react-native/react";

const r = useRecorder<MyShape>({
  audio: Audio,
  apiSlug: "inpatient-vitals",      // your published Studio API
  extractLanguage: "auto",          // detects the spoken language
  silenceAutoStop: { ms: 6000 },    // auto-stop after 6 s of silence
  maxDurationMs: 5 * 60_000,        // hard cap at 5 min
  extractInputs: {                  // forwarded to the server
    patientHash: hash(patient.id),
    recordedById: user.id,
  },
});

// In your render:
<Pressable onPress={r.isRecording ? r.stop : r.start}>
  <Text>{r.isRecording ? `Stop · ${r.durationSec.toFixed(0)}s` : "Record"}</Text>
</Pressable>

// React to results:
useEffect(() => { if (r.data) myForm.setValues(r.data); }, [r.data]);
useEffect(() => { if (r.extractError) showToast(r.extractError); }, [r.extractError]);
```

See `src/screens/VitalsCaptureScreen.tsx` for the full pattern with
review form + transcript display + error banner.

### 3c. Long recordings → async jobs

For recordings > 30 s or any flow where holding the HTTP connection
open is fragile (mobile background, tablet flips off, etc.):

```ts
const { jobId } = await ohm.audio.jobs.create({
  apiSlug: "long-consult",
  file: rnFile,
  language: "auto",
  webhookUrl: "https://your-backend/ohm-callback",  // OPTIONAL
  idempotencyKey: `consult_${patient.id}_${Date.now()}`,
  onProgress: (p) => setUploadPct(p.percent),
});

// Path A: client-side polling (simplest, no backend needed)
const final = await ohm.audio.jobs.poll(jobId, {
  intervalMs: 2000,
  onProgress: (j) => setProgress(j.workerProgress),
});

// Path B: webhook — server-side, no polling. YOUR backend gets a signed
// POST with X-OHM-Signature (HMAC-SHA256) and X-OHM-Delivery-Id.
```

`ohm.audio.extractAsync(input)` is a one-liner that wraps `create + poll`.

See `src/screens/AsyncJobsScreen.tsx` for a full UI (segmented mode
control, progress, cancel, refresh).

### 3d. Already have transcript text? Skip the recorder.

```ts
const { data, version } = await ohm.extract({
  apiSlug: "opd-clinic",
  text: transcribedText,
});
```

See `src/screens/tools/TextExtractTool.tsx`.

### 3e. Summarise free text in 4 styles

```ts
const { summary } = await ohm.summarize({
  text: longConsult,
  style: "patient",          // patient | handover | executive | progress-note
  language: "en",
});
```

See `src/screens/tools/SummarizeTool.tsx`.

### 3f. Show your team what's published (catalog)

```ts
const apis = await ohm.apis.list();         // ApiSummary[]
const detail = await ohm.apis.get(slug);    // schema + prompt + inputs
```

See `src/screens/ApiCatalogScreen.tsx`.

### 3g. Compliance-grade audit search

```ts
const audit = await ohm.invocations.searchByPatient({
  patientHash: sha256(`abha:${patient.abhaId}`),  // YOU hash
  sinceDays: 30,
});
audit.invocations.forEach((row) => console.log(row.endpoint, row.createdAt));
```

OHM never sees the raw identifier. The hash search is a slim
metadata-only view — transcripts and extracted JSON are NEVER returned
via this surface.

See `src/screens/tools/AuditTool.tsx`.

### 3h. Offline queue (flaky wifi, hospital basements, OT lifts)

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { OhmQueue, makeAsyncStorageAdapter, OHMNetworkError } from "@ohm_studio/sdk-react-native";

const queue = new OhmQueue({
  storage: makeAsyncStorageAdapter(AsyncStorage),
  client: ohm,
});

// Failed call? enqueue it.
try {
  await ohm.audio.extract({ apiSlug, file });
} catch (e) {
  if (e instanceof OHMNetworkError) {
    await queue.enqueue("audio.extract", { apiSlug, file });
  } else {
    throw e;
  }
}

// On reconnect (wire NetInfo or expo-network here):
await queue.flush();   // sequential; stops on auth errors
```

See `src/lib/queue.ts` + `src/screens/tools/QueueTool.tsx`.

### 3i. Typed errors — the full ladder

```ts
import {
  OHMAuthError, OHMRateLimitError, OHMValidationError,
  OHMNotFoundError, OHMTimeoutError, OHMNetworkError,
  OHMAbortError, OHMServerError, OHMQuotaExceededError,
  OHMConfigError,
} from "@ohm_studio/sdk-react-native";

try {
  await ohm.extract({ apiSlug, text });
} catch (e) {
  if (e instanceof OHMAuthError)         { /* mint a fresh key */ }
  if (e instanceof OHMRateLimitError)    { /* wait e.retryAfterSec */ }
  if (e instanceof OHMValidationError)   { /* show e.fields[].path */ }
  if (e instanceof OHMNotFoundError)     { /* check apiSlug */ }
  if (e instanceof OHMTimeoutError)      { /* retry, or switch to async */ }
  if (e instanceof OHMNetworkError)      { /* enqueue for replay */ }
  if (e instanceof OHMAbortError)        { /* user cancelled */ }
  if (e instanceof OHMServerError)       { /* 5xx — backoff */ }
  if (e instanceof OHMQuotaExceededError){ /* contact org admin */ }
  if (e instanceof OHMConfigError)       { /* misuse — bad init */ }
}
```

`src/lib/errors.ts` shows a centralised mapper that turns any thrown
error into a friendly `{ title, body, hint }` for the UI.

### 3j. PHI on-device → opaque tokens to server → restore on the way back

```ts
import { restoreTokens } from "@ohm_studio/sdk-react-native";

const tokenMap = { "[PATIENT_1]": "Mr Rajesh Sharma", "[MRN_1]": "MRN 88421" };
const restored = restoreTokens(serverResponse, tokenMap);
```

Your patient identifiers never leave the device. The server returns
opaque tokens; you swap them back to real values you already hold.

See `src/screens/tools/ErrorsTool.tsx::PhiTokenDemo`.

---

## Step 4 — Going to production

The demo ships **test-mode keys** (`ohms_test_*`) inside the bundle.
That's fine for development, **not for shipping a hospital app**:
anyone who reverse-engineers the binary can read the key.

The production pattern is well-known — your phone app talks to **your
backend**, which holds the live key in its secrets manager:

```
┌─────────────┐  session JWT   ┌─────────────┐  ohms_live_*   ┌─────────────┐
│  RN app     │ ──────────────►│  YOUR API   │ ──────────────►│  OHM API    │
│ (this demo) │                │  (proxy)    │                │             │
└─────────────┘                └─────────────┘                └─────────────┘
```

Your backend exposes thin proxy routes (`/proxy/audio/extract`,
`/proxy/jobs`, etc.) that:

1. authenticate the user with **your** session token,
2. forward the multipart body / JSON to OHM with the `ohms_live_*` key,
3. forward the response back.

In your RN app, replace `apiKey` with `baseUrl: 'https://your-backend.example.com'`
on the `OHM` constructor — done. The whole rest of the demo continues
to work; the backend is invisible to the SDK.

Read the full guide → [docs.ohm.doctor/security/rn-key-handling](https://docs.ohm.doctor/security/rn-key-handling)

---

## File map

```
.env.example              copy → .env, fill EXPO_PUBLIC_OHM_API_KEY
App.tsx                   bottom-tab nav (Home / Async / Catalog / Tools)
src/
  components/             shared UI primitives
    Button.tsx
    Card.tsx
    ConnectivityBanner.tsx
    EmptyState.tsx
    ErrorBanner.tsx
    JsonPreview.tsx
    MicButton.tsx
    PatientHeader.tsx
    Pill.tsx
    ProgressBar.tsx
    SegmentedControl.tsx
    VuMeter.tsx
  lib/
    errors.ts             toFriendlyError() — maps any thrown to { title, body, hint }
    format.ts             durations, bytes, relative time, demo patient hash
    ohm-client.ts         single OHM instance, isConfigured guard
    queue.ts              singleton OhmQueue + AsyncStorage adapter
    theme.ts              colors / spacing / type / shadow tokens
    types.ts              VitalsRecord, DoctorNote, NurseShiftHandover, ShiftSlot
  screens/
    SetupScreen.tsx       fresh-clone fallback when .env is empty
    HomeStack.tsx         native stack hosting the 3 capture flows
    HomeScreen.tsx        patient card + 3 action buttons
    VitalsCaptureScreen.tsx
    DoctorNoteScreen.tsx
    NurseShiftScreen.tsx
    AsyncJobsScreen.tsx   long-recording + polling/webhook + cancel
    ApiCatalogScreen.tsx  apis.list / apis.get with snippet generator
    ToolsScreen.tsx       segmented sub-tab host
    tools/
      TextExtractTool.tsx     ohm.extract
      SummarizeTool.tsx       ohm.summarize
      ErrorsTool.tsx          every typed error + restoreTokens
      AuditTool.tsx           ohm.invocations.searchByPatient
      QueueTool.tsx           OhmQueue inspector + flush()
      LanguagesTool.tsx       SUPPORTED_LANGUAGES + SPEAKER_MODES catalogue
```

---

## Troubleshooting

**Blank Metro screen on first run.** Clear cache: `npx expo start --clear`.

**Mic permission denied.** iOS simulator doesn't have a real mic — use
a physical device (Expo Go) or accept the permission prompt on first
recording. Android emulator: enable host audio under AVD settings.

**`ohms_live_*` rejected.** Bundling live keys in mobile binaries is
unsafe. Switch to a test key, or set up the backend proxy described in
Step 4.

**`OHMNotFoundError` on extract.** The `apiSlug` doesn't match any
Published API on your key's project. Check the **Catalog** tab — it
lists every slug your key can call.

**Async webhook never arrives.** OHM signs the POST with HMAC-SHA256.
Make sure your backend route returns 2xx — the retry policy is
exponential (5 m → 30 m → 2 h → 5 h → 10 h → 24 h → 24 h, ~3 days
total).

---

## See also

- **Docs** — [docs.ohm.doctor](https://docs.ohm.doctor)
- **Async extraction** — [docs.ohm.doctor/sdk/async-extraction](https://docs.ohm.doctor/sdk/async-extraction)
- **RN key handling** — [docs.ohm.doctor/security/rn-key-handling](https://docs.ohm.doctor/security/rn-key-handling)
- **Studio CLI (codegen for typed `data`)** — [docs.ohm.doctor/sdk/cli](https://docs.ohm.doctor/sdk/cli)
- **Companion backend example** — `examples/hospital-integration` (the published Studio APIs this app calls)
