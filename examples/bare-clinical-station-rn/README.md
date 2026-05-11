# Bare Clinical Station · React Native (no Expo)

A bare React Native (no Expo) version of [`examples/clinical-station-rn`](../clinical-station-rn).

Same demo. Same screens. Same SDK features. The only difference is the
native plumbing — this one runs on **React Native CLI**, no Expo
dependencies anywhere.

---

## Run it in 3 steps

### 1. Get a test API key

1. Open https://studio.ohm.doctor → **Keys**
2. Click **New key** → **Test mode**
3. Copy the `ohms_test_…` string

### 2. Configure

```bash
cd examples/bare-clinical-station-rn
cp .env.example .env
```

Open `.env` and paste your key:

```bash
EXPO_PUBLIC_OHM_TEST_KEY=ohms_test_xxxxxxxxxxxxxx
EXPO_PUBLIC_OHM_API_SLUG=opd-clinic
```

> The variable names start with `EXPO_PUBLIC_` to match the Expo demo's
> env file — the bare-RN client reads them through `process.env` just
> the same. Keep the names as-is.

### 3. Install + run

```bash
npm install
cd ios && pod install && cd ..    # iOS only

npm run ios       # or
npm run android
```

**That's it.** Everything else (mic permission strings, vector-icons font
linking, scaffolded `ios/` and `android/` folders) is already committed
in this directory.

> Test on a **physical device** for audio recording — the iOS Simulator
> and Android emulator both have known microphone quirks.

---

## What you'll see

| Tab | What it does |
|---|---|
| **Home** | Tap **Vitals**, **Doctor note**, or **Shift handover** → record → see live transcript + structured JSON |
| **Async** | Long recording with upload progress, polling, optional webhook |
| **Catalog** | Browse available APIs, see how to call each one |
| **Tools** | Text extract · Summarize · Errors playground · Audit search · Queue · Languages |

Connectivity banner, mic permission flow, typed-error pattern matching,
offline queue replay, PHI restore — all wired and working.

---

## How this differs from the Expo demo

Same source code, different native libraries:

| Purpose | Expo demo | This bare-RN demo |
|---|---|---|
| Audio recording | `expo-av` + SDK's Expo `useRecorder` | `react-native-audio-recorder-player` + SDK's `BareRecorder` |
| Haptics | `expo-haptics` | `react-native-haptic-feedback` |
| Clipboard | `expo-clipboard` | `@react-native-clipboard/clipboard` |
| Network status | `expo-network` | `@react-native-community/netinfo` |
| Icons | `@expo/vector-icons` | `react-native-vector-icons` |
| Status bar | `expo-status-bar` | RN built-in `StatusBar` |

Two small files (`src/lib/native-bridges.ts` + `src/hooks/useBareRecorder.ts`)
hide the differences so every screen and component file is line-for-line
identical to the Expo demo — just with different import paths.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `pod install` fails | Run `cd ios && rm -rf Pods Podfile.lock && pod install --repo-update` |
| Mic permission dialog never appears (iOS) | Uninstall and reinstall the app on the device — iOS caches the permission state per-bundle |
| Mic permission dialog never appears (Android) | Confirm Android's "Auto reset" hasn't revoked it; re-run `npm run android` after reinstall |
| `Ionicons` glyphs render as `?` boxes | Run `npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output /tmp/x.jsbundle` once to trigger font copy — or just `cd ios && pod install && cd .. && npm run ios` again |
| `OHMAuthError` on first call | Check your `ohms_test_…` key in `.env` is pasted correctly |

---

## Production checklist

Before you ship a bare-RN app to App Store / Play Store:

- [ ] **Never embed `ohms_live_*` in a mobile bundle.** Use the proxy
      pattern: https://docs.ohm.doctor/security/rn-key-handling
- [ ] Set `acknowledgeBundledKey: true` on the `OHM` constructor — the
      SDK refuses to start with a live key otherwise.
- [ ] Tested on a real iOS device and a real Android device.
- [ ] Audit-trail fields (`patientHash`, `recordedById`) wired to real
      session values, not the demo placeholders.

---

## See also

- [`examples/clinical-station-rn`](../clinical-station-rn) — Expo version of this demo
- [`examples/react-native-bare`](../react-native-bare) — minimal bare-RN recorder
- https://docs.ohm.doctor/sdk/react-native — full SDK reference
- https://docs.ohm.doctor/security/rn-key-handling — proxy pattern + dev/prod keys
