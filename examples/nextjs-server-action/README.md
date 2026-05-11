# OHM SDK · Next.js server action example

Browser-side voice recorder + Next.js server action that calls
`ohm.audio.extract` using the **live** key on the server. The browser
never sees the key.

## What it shows

- Server-side `OHM` client initialised with a live key (env-driven)
- `'use server'` action receiving a `Blob` and forwarding to OHM
- **Pattern-matched typed-error handling** — `OHMRateLimitError` returns
  `retryAfterSec` to the browser, `OHMAuthError` is server-logged only
  (no key state leak), `OHMValidationError` forwards `fields[]` so the
  UI can highlight the failing inputs
- **English-only transcript** — OHM's STT runs in translate mode, so a
  Tamil / Hindi / Telugu / Bengali consult comes back as clean English
  text with no client-side translation step
- Browser-side `Recorder` from `@ohm_studio/sdk` with:
  - codec cascade across Chrome / Firefox / Safari
  - 8s silence auto-stop
  - 15-min hard cap
  - wake-lock so tablets don't dim mid-consult
  - VU meter
- Clean separation: live key stays server-side, never bundled

## Build & run

```bash
# from inside the cloned repo:
cd examples/nextjs-server-action

# 1 — install
npm install

# 2 — get a key
# Sign in at https://studio.ohm.doctor → Keys → New key
# Use a TEST key for development (ohms_test_*)
cp .env.local.example .env.local
# edit .env.local and paste your key

# 3 — run
npm run dev

# open http://localhost:3030 and hit Record
```

## Environment

| Variable | Default | What it is |
|---|---|---|
| `OHM_API_KEY` | (required) | `ohms_test_…` for dev, `ohms_live_…` in production. Stays server-side. |
| `OHM_BASE_URL` | `https://api.ohm.doctor` | Override only if self-hosting OHM. |
| `OHM_API_SLUG` | `opd-clinic` | The slug of the published API in your project. |

## Going to production

- Move `OHM_API_KEY` into your platform's secret manager (Vercel env, AWS
  Parameter Store, etc.) — never commit `.env.local`
- The action's typed-error pattern (rate-limit, auth, validation, server)
  is already in place — extend with your own logging / retry policy as
  needed. See [docs.ohm.doctor/troubleshooting](https://docs.ohm.doctor/troubleshooting).
- Consider streaming via `ohm.audio.extract.stream({ ... })` for halved
  perceived latency — see [docs.ohm.doctor/sdk/streaming](https://docs.ohm.doctor/sdk/streaming)
- Wrap with `usePendingRecordings()` to recover audio if the tab crashes
  mid-upload — see [docs.ohm.doctor/sdk/recorder](https://docs.ohm.doctor/sdk/recorder)

## Reference

- [Browser Recorder docs](https://docs.ohm.doctor/sdk/recorder)
- [API reference](https://docs.ohm.doctor/sdk/api-reference)
- [Troubleshooting](https://docs.ohm.doctor/troubleshooting)
- [Cookbook · Build a Visit feature](https://docs.ohm.doctor/cookbook/visit-feature)
