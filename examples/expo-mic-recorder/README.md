# OHM SDK · Expo mic recorder

Smallest possible Expo app: tap a button → record → get back transcript
+ structured clinical JSON. Whole feature fits in `App.tsx` (~150 lines).

---

## Step 1 — Install

```bash
cd examples/expo-mic-recorder
npm install
```

## Step 2 — Set your key

```bash
cp .env.example .env
# Edit .env:
#   EXPO_PUBLIC_OHM_TEST_KEY=ohms_test_xxxxxxxxxxxxxxxxxxxx
#   EXPO_PUBLIC_OHM_API_SLUG=opd-clinic     ← any published Studio slug
```

Mint a **test-mode** key: Studio → Keys → New key → Reveal. Live keys
(`ohms_live_*`) are rejected in RN bundles by the SDK — anyone who
unzips your APK/IPA can read the bundle, so live keys belong in your
backend.

## Step 3 — Run

```bash
npx expo start --clear
# Press i (iOS sim), a (Android emu), or scan the QR with Expo Go.
```

If `.env` isn't filled in, the app shows a setup screen with the
3-step fix instead of crashing.

---

## What the demo shows

- `useRecorder({ audio: Audio, apiSlug })` — one hook gives you start /
  stop / level / duration / transcript / data
- 16 kHz mono AAC clinical preset (set automatically)
- 8 s silence auto-stop, 15-min hard cap
- iOS audio session set up so recording works in silent mode
- VU meter + duration counter
- Auto-extract on stop via `<OhmProvider>`
- Friendly errors (`r.error`, `r.extractError`)

---

## Common errors

| Symptom | What it means | Fix |
|---|---|---|
| Setup screen | `.env` missing or key not `ohms_test_*` | `cp .env.example .env`, edit, restart |
| `OHMConfigError: Live OHM keys must NOT ship in RN bundles` | You used `ohms_live_*` | Use a test key; live keys belong in your backend |
| `OHMNotFoundError` on extract | `EXPO_PUBLIC_OHM_API_SLUG` doesn't match a Published API | Check slug in Studio; fix `.env` and restart |
| Silent button (no audio level) | Mic permission denied | iOS: simulator has no mic — use Expo Go on a real phone. Android: enable host audio in AVD. |

---

## Going to production

- **Never bundle a live key.** Stand up a tiny backend that holds
  `ohms_live_*` and forwards multipart from the app:
  → `examples/nextjs-server-action` is the canonical pattern
- Wire `OHMNetworkError` to disable the record button when offline
- For >30s recordings, switch to `ohm.audio.jobs.create` + polling
  (or webhook callback) — see `examples/clinical-station-rn` Async tab

## See also

- `examples/clinical-station-rn` — full 4-tab demo of every SDK feature
- `examples/visit-feature-expo` — same flow with persistence + 3 screens
- [docs.ohm.doctor/sdk/react-native](https://docs.ohm.doctor/sdk/react-native)
- [docs.ohm.doctor/security/rn-key-handling](https://docs.ohm.doctor/security/rn-key-handling)
