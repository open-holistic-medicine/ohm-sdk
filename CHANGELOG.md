# Changelog

All notable changes to the example projects in this repo.

## 2026-05-18 — SDK 0.12.0 (hospital-deployed architecture)

All examples now pinned to:

- `@ohm_studio/sdk@^0.12.0`
- `@ohm_studio/sdk-react-native@^0.12.0`
- (transitive) `@ohm_studio/sdk-core@^0.10.0`

### What changed at the platform level

OHM now ships as **two separately-deployed Docker images**:

- **Hospital orchestrator** runs at every hospital (`api.<hospital>.example`).
  Auth, PHI, audit, queue. This is what your SDK calls.
- **OHM Engine** runs only at OHM (`api.ohm-engine.in`). Holds the
  STT / LLM vendors, prompts, extraction logic, full reference data.

When you call the SDK, requests still go to a hospital orchestrator.
The orchestrator forwards AI work to the engine internally — your
code never sees the engine.

### What changed for SDK users

**`baseUrl` should point at the hospital you're integrating with.**
Each hospital exposes its own API URL — there is no single global
SaaS endpoint anymore.

```ts
const ohm = new OHM({
  apiKey: process.env.OHM_API_KEY!,
  baseUrl: process.env.OHM_API_URL!,    // e.g. https://api.kauvery.example
});
```

`https://api.ohm.doctor` still works as the default — it's OHM's own
demo hospital deployment. For production integration with a specific
customer hospital, set `OHM_API_URL` to their URL.

### Response shapes

Every endpoint that returned `tokensUsed` / `inputTokens` /
`outputTokens` now also surfaces them in a consistent `usage` block
alongside the result. Existing fields stay for backward compatibility;
new code should read the `usage` block.

### Vendor-neutral errors

All upstream failures are now mapped to vendor-neutral codes:

- `ENGINE_VENDOR_UNAVAILABLE`
- `ENGINE_RATE_LIMITED`
- `ENGINE_TIMEOUT`
- `ENGINE_INTERNAL`

Provider names (Sarvam, Gemini, OpenAI, etc.) no longer appear in any
error path. Update any error-handling that pattern-matches on those
strings.

### Migration

```diff
- baseUrl: "https://api.ohm.doctor",
+ baseUrl: process.env.OHM_API_URL!,   // ask hospital admin
```

```bash
cd examples/<example-name>
npm install
```

---

## 2026-05-18 — SDK 0.11.1 (validation pass)

Patch release that completes the v0.11.0 hardening:

- **Type completeness**: `JobDetail` and the streaming `transcript` chunk now expose `chunked` / `chunkCount`. Previously these fields existed only on the sync `transcribe` / `extract` responses; now polling-based async jobs and SSE streaming see them too.
- **Server**: every LLM-using Studio service (`insights`, `summarize`, `ai-assist`) gained a hard 120-240s LLM ceiling — matching `extract`. No more hangs on the playground, `/summarize`, or `/ai-assist` endpoints.
- **Server**: `StudioExtractionJob` schema gained `chunked` + `chunkCount` columns so async-job consumers can surface chunk-boundary warnings.

Migration: `npm install` in any example.

---

## 2026-05-18 — SDK 0.11.0 bump

Every example bumped to `@ohm_studio/sdk@^0.11.0` / `@ohm_studio/sdk-react-native@^0.11.0`. No code changes required — every new feature is backward-compatible.

### New in the SDK (see full notes at https://docs.ohm.doctor/changelog)

- **`chunked` / `chunkCount`** on `AudioTranscribeResult` and `AudioExtractResult` — set when the server splits an hour-plus recording into multiple STT chunks. Surface a small warning in your UI when you see it.
- **Pre-upload file-size guard (500 MB)** — the SDK now throws `OHMValidationError` synchronously if you pass an oversize file. No more silent slow-upload-then-fail.

### Migration

```bash
# Anywhere in this repo:
cd examples/<example-name>
npm install
```

Caret ranges (`^0.10.0`) don't pick up `0.11.x` automatically — that's why every example's `package.json` had to be bumped explicitly in this commit.

---

## 2026-05-11 — SDK 0.10.0

Total-deadline + auto-idempotency + bulk + warmUp + hooks. See https://docs.ohm.doctor/changelog#v0100 for the full breakdown.
