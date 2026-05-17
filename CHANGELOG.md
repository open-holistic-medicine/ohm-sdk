# Changelog

All notable changes to the example projects in this repo.

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
