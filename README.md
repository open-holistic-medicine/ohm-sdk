# OHM Studio SDK

> Voice → clinical JSON in five lines. Built for hospitals.

[![@ohm_studio/sdk on npm](https://img.shields.io/npm/v/@ohm_studio/sdk?label=%40ohm_studio%2Fsdk)](https://www.npmjs.com/package/@ohm_studio/sdk)
[![@ohm_studio/sdk-react-native on npm](https://img.shields.io/npm/v/@ohm_studio/sdk-react-native?label=react-native)](https://www.npmjs.com/package/@ohm_studio/sdk-react-native)
[![Docs](https://img.shields.io/badge/docs-ohm.doctor-0d9488)](https://docs.ohm.doctor)

OHM Studio is a clinical extraction API for hospitals: speak the consult,
get back a typed JSON object you can save, print, or push into FHIR.

This repo holds the **runnable examples** for the OHM Studio SDK. The SDK
itself is published to npm — install it directly:

```bash
npm install @ohm_studio/sdk                  # web · Node · Next.js
npm install @ohm_studio/sdk-react-native     # React Native · Expo
```

## Five lines

```ts
import { OHM } from "@ohm_studio/sdk";

const ohm = new OHM(process.env.OHM_API_KEY!);

const { transcript, data } = await ohm.audio.extract({
  apiSlug: "opd-clinic",
  file: audioBlob,
});
```

## What's in this repo

**Full visit features** (start here for EMR work):

| Folder | What it shows |
|---|---|
| [`examples/visit-feature-expo`](./examples/visit-feature-expo) | Full visit feature on mobile — 3 screens, persisted history |
| [`examples/visit-feature-nextjs`](./examples/visit-feature-nextjs) | Full visit feature on web — 3 routes, server-action-protected key |

**Production patterns:**

| Folder | What it shows |
|---|---|
| [`examples/webhook-receiver`](./examples/webhook-receiver) | Express HMAC-SHA256 verifier for `invocation.success` / `failed` / `quota.warning` |
| [`examples/streaming`](./examples/streaming) | `audio.extract.stream()` — transcript renders before structured JSON |

**Minimal SDK demos:**

| Folder | What it shows |
|---|---|
| [`examples/node-cli`](./examples/node-cli) | Summarize a text file from the command line in 30 lines |
| [`examples/nextjs-server-action`](./examples/nextjs-server-action) | Browser `Recorder` + Next.js server action |
| [`examples/expo-mic-recorder`](./examples/expo-mic-recorder) | 1-screen `useRecorder` demo (Expo) |
| [`examples/react-native-bare`](./examples/react-native-bare) | Bare RN with `BareRecorder` adapter |

Each folder is a standalone project — clone, `npm install`, mint a
test-mode key from [studio.ohm.doctor](https://studio.ohm.doctor), set
`OHM_API_KEY`, run.

## Why use OHM

- **Voice-to-structured-JSON** — speak the consult, get the typed object
- **23-language clinical STT** — Hindi, Tamil, Bengali, Telugu, Marathi, English (India), and 18 more
- **Doctor / Doctor + Patient speaker modes** — single-speaker dictation or two-speaker conversation
- **FHIR R4 / ABDM / ICD-10 / SNOMED / LOINC** ready by field-type
- **Browser Recorder** — codec cascade across iOS Safari + Firefox + Chromium, VU metering, silence auto-stop, wake-lock, IndexedDB recovery
- **`useRecorder()` React hook** — one call, all of the above plus auto-extract
- **AbortSignal + onProgress** on every method (v0.6+); React hooks auto-abort on unmount
- **`ohm.apis.list()`** — discover published Studio APIs without hard-coding slugs
- **Typed `data` via [`@ohm_studio/cli`](https://www.npmjs.com/package/@ohm_studio/cli)** — `npx ohm-studio pull-all` generates TypeScript interfaces from your Studio schemas

Full reference at [docs.ohm.doctor](https://docs.ohm.doctor).

## Quickstart

1. Sign in at [studio.ohm.doctor](https://studio.ohm.doctor)
2. Create a project → clone an OPD or Triage starter → click **Publish**
3. Mint a test-mode key from the Keys page
4. Pick an example below, set `OHM_API_KEY`, run

## Documentation

- [5-minute quickstart](https://docs.ohm.doctor/getting-started/quickstart)
- [Browser Recorder reference](https://docs.ohm.doctor/sdk/recorder)
- [React Native SDK reference](https://docs.ohm.doctor/sdk/react-native)
- [API reference](https://docs.ohm.doctor/sdk/api-reference)
- [Build a Visit feature (cookbook)](https://docs.ohm.doctor/cookbook/visit-feature)
- [Changelog](https://docs.ohm.doctor/changelog)

## License

MIT — see [LICENSE](./LICENSE). The SDK source code itself is published to
npm under the same license; this repo is the open companion for examples
and reference material.
