# OHM RN SDK · Bare React Native example

Same flow as the Expo demo, but for projects that aren't on Expo. Uses
`BareRecorder` from `@ohm_studio/sdk-react-native`, which adapts
[`react-native-audio-recorder-player`](https://github.com/hyochan/react-native-audio-recorder-player)
behind the same lifecycle as `ExpoRecorder`.

## What it shows

- `BareRecorder(AudioRecorderPlayer)` — instance lifecycle
- 16 kHz mono AAC clinical preset (configured automatically)
- 8s silence auto-stop, 15-min hard cap
- Same `RecorderError` codes and `{ uri, name, type }` file shape as Expo

## Build & run

This example is a `package.json` + `App.tsx` + `index.js` — it expects
to drop into a fresh React Native project. Two ways to run it:

### Option 1 · Drop into a fresh React Native project (recommended)

```bash
# 1 — create a fresh RN project somewhere
npx @react-native-community/cli@latest init OhmDemo

# 2 — copy this example's source files in
cd OhmDemo
cp /path/to/this/example/App.tsx ./App.tsx
cp /path/to/this/example/index.js ./index.js

# 3 — install the SDK and the recorder lib
npm install @ohm_studio/sdk-react-native react-native-audio-recorder-player

# 4 — iOS pods
cd ios && pod install && cd ..

# 5 — set your test-mode key in App.tsx (or wire .env via your build setup)

# 6 — run
npm run ios       # or
npm run android
```

### Option 2 · Standalone (advanced)

If you want to run the directory as-is without the RN init scaffolding
you'll need to provide your own `ios/` and `android/` folders (these are
huge and platform-specific, hence not committed). Most teams do Option 1.

## Permissions

Add the following to your project once:

**iOS** — `ios/<App>/Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>Record consultations to extract structured clinical notes.</string>
```

**Android** — `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

## What you'll see

Tap RECORD, speak any of the 23 supported languages (Tamil, Hindi,
Telugu, Bengali, English …), tap STOP. The screen renders:

- **Transcript** — always **English**, even if you spoke a non-English
  language. OHM's STT runs in translate mode, so multilingual /
  code-mixed consults come back as clean English.
- **Structured JSON** — matches the schema of the `apiSlug` you pointed
  at (default `opd-clinic`).

## Error handling pattern

`App.tsx` demonstrates pattern-matched typed errors from the SDK:

```ts
import {
  OHMRateLimitError,
  OHMAuthError,
  OHMServerError,
} from "@ohm_studio/sdk-react-native";

try {
  const r = await ohm.audio.extract({ apiSlug, file });
} catch (err) {
  if (err instanceof OHMRateLimitError) {
    setError(`Slow down — try again in ${err.retryAfterSec ?? 60}s`);
  } else if (err instanceof OHMAuthError) {
    setError("Authorization failed — check your test-mode API key");
  } else if (err instanceof OHMServerError) {
    setError("OHM service is having a moment; please retry");
  } else {
    setError((err as Error)?.message || "Extraction failed");
  }
}
```

See [docs.ohm.doctor/troubleshooting](https://docs.ohm.doctor/troubleshooting)
for the full triage table.

## Going to production

- **Never bundle a live key** in a mobile binary — the SDK throws on
  `ohms_live_*` in RN unless `acknowledgeBundledKey: true`. Set up a
  backend proxy instead.
- See [docs.ohm.doctor/security/rn-key-handling](https://docs.ohm.doctor/security/rn-key-handling)
  for the full pattern.
- Add a network-status banner — the SDK's underlying `fetch` throws on
  offline; surface that to the user instead of "Extraction failed".
- Cap audio length — `react-native-audio-recorder-player` doesn't auto-stop.
  Add a 15-minute cap or a silence-detection layer (the Expo example
  uses `useRecorder` which ships these guards out of the box).

## Reference

- [React Native SDK docs](https://docs.ohm.doctor/sdk/react-native)
- [`BareRecorder` reference](https://docs.ohm.doctor/sdk/react-native#bare-rn)
- [Troubleshooting](https://docs.ohm.doctor/troubleshooting)
