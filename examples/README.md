# OHM Studio SDK examples

Ten end-to-end runnable samples covering every public surface of the
OHM SDK. Each example is **idiot-proof** — graceful fallbacks when
config is missing, typed-error catching, copy-paste setup steps in
the README, and a working app on `npm start`.

All examples are pinned to **`@ohm_studio/sdk@^0.10.0`** /
**`@ohm_studio/sdk-react-native@^0.10.0`** — the latest release.
Highlights: total-deadline budget, auto-`Idempotency-Key`,
`ohm.warmUp()`, `ohm.extractBulk([...])`, lifecycle hooks, opt-in
HTTP/2 multiplexing. See
[`docs.ohm.doctor/sdk/reliability`](https://docs.ohm.doctor/sdk/reliability)
and
[`/sdk/performance`](https://docs.ohm.doctor/sdk/performance).

---

## The full demo (start here)

| Folder | Stack | What it shows |
|---|---|---|
| **[`clinical-station-rn/`](./clinical-station-rn)** | Expo · 4 bottom tabs | The complete RN demo — every SDK feature in one app. Sync `useRecorder`, async jobs (polling + webhook), API catalog, errors playground, offline queue, audit search, languages catalogue, PHI restore, idempotency, upload progress, abort. |

---

## Hospital-integration kit (paired Studio + RN)

For inpatient ward EMRs replacing a `webkitSpeechRecognition` + regex
parser. Two paired folders — Studio side first, then drop the RN
screens into your existing app.

| Folder | Stack | What it shows |
|---|---|---|
| **[`hospital-integration/`](./hospital-integration)** | Studio APIs + Node probe | 3 published Studio schemas (vitals · doctor-note · nurse-shift) + sanity probe. Step-by-step Studio config. |
| **[`clinical-station-rn/`](./clinical-station-rn)** | Expo + `expo-av` | 3 drop-in React Native screens calling those schemas, plus 6 more demoing the rest of the SDK. |

---

## Visit feature (canonical EMR sample)

| Folder | Stack | What it shows |
|---|---|---|
| **[`visit-feature-expo/`](./visit-feature-expo)** | Expo + React Navigation + AsyncStorage | Mobile visit feature — 3 screens, persisted history, `useRecorder` auto-extract. |
| **[`visit-feature-nextjs/`](./visit-feature-nextjs)** | Next.js 15 + localStorage | Web visit feature — 3 routes, server-action-protected key. Mirrors the Expo demo. |

---

## Production patterns

| Folder | Stack | What it shows |
|---|---|---|
| **[`webhook-receiver/`](./webhook-receiver)** | Express 5 + `node:crypto` | HMAC-SHA256 verification + delivery dedupe + dispatch for **6 event types** including async-job callbacks. |
| **[`streaming/`](./streaming)** | Next.js 15 (SSE) | `audio.extractStream()` — transcript renders before structured JSON. |

---

## Minimal SDK demos

| Folder | Stack | What it shows |
|---|---|---|
| **[`node-cli/`](./node-cli)** | Node 18+ + `tsx` | One CLI, six subcommands: `summarize`, `extract`, `transcribe`, `async`, `list`, `show`. |
| **[`nextjs-server-action/`](./nextjs-server-action)** | Next.js 15 | Browser `Recorder` + server-action wrapping `ohm.audio.extract`. Live key stays server-side. |
| **[`expo-mic-recorder/`](./expo-mic-recorder)** | Expo + `expo-av` | Smallest one-screen demo of `useRecorder`. |
| **[`react-native-bare/`](./react-native-bare)** | Bare RN + `react-native-audio-recorder-player` | `BareRecorder` adapter — same lifecycle as `ExpoRecorder`, no Expo dependency. |

---

## What every example guarantees

| Guarantee | How |
|---|---|
| **No silent crash on missing config** | Each example detects an unset / placeholder `OHM_API_KEY` and prints a 3-step fix (Node) or shows a setup screen (RN). |
| **Typed-error catching** | All 10 `OHM*Error` classes (`OHMAuthError`, `OHMValidationError`, `OHMRateLimitError`, `OHMNotFoundError`, `OHMTimeoutError`, `OHMNetworkError`, `OHMServerError`, `OHMQuotaExceededError`, `OHMAbortError`, `OHMConfigError`) — each with a friendly user-facing message. |
| **English transcripts** | Speak any of 23 supported languages — `audio.transcribe` / `audio.extract` always return clean English text. |
| **Live keys never bundle** | RN examples show the test-key + `acknowledgeBundledKey` pattern. Server examples (Node CLI / Next.js / Express) keep `ohms_live_*` server-side via env. |
| **Real npm packages** | All examples install the published SDKs from npm — no workspace links — so you see exactly what a customer sees after `npm install`. |

---

## Run any sample

```bash
cd examples/<sample>
npm install
cp .env*.example .env*       # copy + edit per the sample's README
npm start                    # or npm run dev, npm run probe — see README
```

Every sample's README walks you through the 3-step setup. The shortest
path to a working SDK call:

```bash
cd examples/node-cli
npm install
echo "OHM_API_KEY=ohms_test_xxx" > .env
npm start summarize ./consult.txt
```

---

## Common setup

Mint a test-mode key from
**[studio.ohm.doctor](https://studio.ohm.doctor)** → Keys → New key →
Test mode.

- **Test keys (`ohms_test_*`)** — safe to ship in dev bundles. Free.
- **Live keys (`ohms_live_*`)** — production. **Never** bundle in mobile
  binaries. Hold them in your backend's secrets manager and proxy from
  there. See
  [docs.ohm.doctor/security/rn-key-handling](https://docs.ohm.doctor/security/rn-key-handling).

---

## Pairs that go together

| If you want to… | Read these together |
|---|---|
| Build a hospital RN app end-to-end | `hospital-integration/` (Studio schemas) → `clinical-station-rn/` (RN UI) |
| Long recordings with backend callbacks | `clinical-station-rn/` (Async tab in webhook mode) ⇄ `webhook-receiver/` (your backend) |
| Submit async jobs from a script | `node-cli/` (`npm start async`) ⇄ `webhook-receiver/` (your backend) |
| Server-side proxy for a web/mobile client | `nextjs-server-action/` (sync) or `streaming/` (SSE) |

---

## Reference

- **Docs** → https://docs.ohm.doctor
- **Async jobs** → https://docs.ohm.doctor/sdk/async-extraction
- **Errors** → https://docs.ohm.doctor/sdk/javascript#errors
- **RN key handling** → https://docs.ohm.doctor/security/rn-key-handling
- **Build a Visit feature (cookbook)** → https://docs.ohm.doctor/cookbook/visit-feature
- **Troubleshooting** → https://docs.ohm.doctor/troubleshooting
