"use server";

import {
  OHM,
  OHMAuthError,
  OHMNetworkError,
  OHMNotFoundError,
  OHMRateLimitError,
  OHMServerError,
  OHMTimeoutError,
  OHMValidationError,
} from "@ohm_studio/sdk";

// Validate env up-front so a missing key fails on `npm run dev` startup,
// not on the first user click. The Next.js server console will print
// the instructions; the page will still render an actionable error.
const apiKey = process.env.OHM_API_KEY;
if (!apiKey) {
  console.error(
    "[ohm] OHM_API_KEY not set. Run `cp .env.local.example .env.local` and edit it.",
  );
} else if (!apiKey.startsWith("ohms_")) {
  console.error(
    "[ohm] OHM_API_KEY does not start with 'ohms_' — invalid key.",
  );
}

const ohm = apiKey
  ? new OHM({
      apiKey,
      baseUrl: process.env.OHM_BASE_URL || "https://api.ohm.doctor",
    })
  : null;

const API_SLUG = process.env.OHM_API_SLUG || "opd-clinic";

/**
 * Server action: receives multipart audio from the browser uploader and
 * forwards to OHM. Live keys stay on the server — never leak to the client.
 *
 * The transcript comes back in English regardless of the spoken language
 * (OHM's STT runs in translate mode), so downstream code can render it
 * directly without a translation pass.
 */
export async function extractAction(formData: FormData) {
  if (!ohm) {
    return {
      ok: false as const,
      error:
        "Server is not configured. Set OHM_API_KEY in .env.local and restart.",
      code: "CONFIG",
    };
  }
  const file = formData.get("audio");
  if (!(file instanceof Blob)) {
    return {
      ok: false as const,
      error: "audio field missing",
      code: "BAD_REQUEST",
    };
  }
  try {
    const result = await ohm.audio.extract({
      apiSlug: API_SLUG,
      file,
      // language: "auto" is the default; uncomment to hint the source
      // language for slightly faster STT on heavy code-mix.
      // language: "ta",
    });
    return {
      ok: true as const,
      transcript: result.transcript,
      data: result.data,
    };
  } catch (err) {
    // Pattern-matched error handling — each branch shows what a
    // production handler would do. See docs.ohm.doctor/troubleshooting
    // for the full triage table.
    if (err instanceof OHMRateLimitError) {
      return {
        ok: false as const,
        error: `Rate limit exceeded — retry after ${err.retryAfterSec ?? 60}s`,
        code: "RATE_LIMITED",
        retryAfterSec: err.retryAfterSec,
      };
    }
    if (err instanceof OHMAuthError) {
      // 401/403 — server-side log only (don't leak key state to client)
      console.error("[ohm] auth error", err.code, err.requestId);
      return { ok: false as const, error: "Authorization failed", code: "AUTH" };
    }
    if (err instanceof OHMNotFoundError) {
      return {
        ok: false as const,
        error: `API "${API_SLUG}" not found — check OHM_API_SLUG.`,
        code: "NOT_FOUND",
      };
    }
    if (err instanceof OHMValidationError) {
      return {
        ok: false as const,
        error: "Validation failed",
        code: "VALIDATION",
        fields: err.fields,
      };
    }
    if (err instanceof OHMTimeoutError) {
      return {
        ok: false as const,
        error: "Extraction timed out — try a shorter recording or use async jobs.",
        code: "TIMEOUT",
      };
    }
    if (err instanceof OHMNetworkError) {
      return {
        ok: false as const,
        error: "Network error reaching OHM — please retry.",
        code: "NETWORK",
      };
    }
    if (err instanceof OHMServerError) {
      console.error("[ohm] server error", err.code, err.requestId);
      return {
        ok: false as const,
        error: "Service temporarily unavailable",
        code: "SERVER",
      };
    }
    // Unknown — log + generic.
    console.error("[ohm] unknown error", err);
    return { ok: false as const, error: "Extraction failed", code: "UNKNOWN" };
  }
}
