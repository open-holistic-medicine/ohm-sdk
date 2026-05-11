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
import type { ExtractedVisit } from "@/lib/types";

// Validate up-front — log to server console if missing so the developer
// gets an actionable hint without crashing the whole render path.
const apiKey = process.env.OHM_API_KEY;
if (!apiKey) {
  console.error(
    "[ohm] OHM_API_KEY not set. Run `cp .env.local.example .env.local` and edit it.",
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
 * Server action — receives recorded audio + patient context, calls
 * OHM Studio, returns the typed JSON. Live key stays server-side.
 *
 * Returns a discriminated union so the caller's error UI doesn't have
 * to second-guess shape:
 *   { ok: true,  transcript, data, durationSec }
 *   { ok: false, error, code }
 */
export async function extractVisitAction(formData: FormData): Promise<
  | {
      ok: true;
      transcript: string;
      data: ExtractedVisit;
      durationSec: number;
    }
  | { ok: false; error: string; code: string }
> {
  if (!ohm) {
    return {
      ok: false,
      error:
        "Server is not configured. Set OHM_API_KEY in .env.local and restart.",
      code: "CONFIG",
    };
  }
  const file = formData.get("audio");
  const patientId = String(formData.get("patientId") || "");
  const speakerMode =
    (formData.get("speakerMode") as "doctor" | "doctor_patient") ||
    "doctor_patient";
  const durationSec = Number(formData.get("durationSec") || 0);

  if (!(file instanceof Blob) || file.size === 0) {
    return { ok: false, error: "audio missing", code: "BAD_REQUEST" };
  }
  if (!patientId.trim()) {
    return { ok: false, error: "patient id required", code: "BAD_REQUEST" };
  }

  try {
    const result = await ohm.audio.extract<ExtractedVisit>({
      apiSlug: API_SLUG,
      file,
      speakerMode,
      inputs: { patientId },
    });
    return {
      ok: true,
      transcript: result.transcript,
      data: result.data,
      durationSec,
    };
  } catch (err) {
    if (err instanceof OHMRateLimitError) {
      return {
        ok: false,
        error: `Rate limited — retry in ${err.retryAfterSec ?? 60}s.`,
        code: "RATE_LIMITED",
      };
    }
    if (err instanceof OHMAuthError) {
      console.error("[ohm] auth error", err.code, err.requestId);
      return { ok: false, error: "Authorization failed.", code: "AUTH" };
    }
    if (err instanceof OHMNotFoundError) {
      return {
        ok: false,
        error: `API "${API_SLUG}" not found — check OHM_API_SLUG.`,
        code: "NOT_FOUND",
      };
    }
    if (err instanceof OHMValidationError) {
      return {
        ok: false,
        error: `Validation failed${err.fields?.length ? `: ${err.fields.join(", ")}` : ""}.`,
        code: "VALIDATION",
      };
    }
    if (err instanceof OHMTimeoutError) {
      return {
        ok: false,
        error:
          "Extraction timed out — try a shorter recording or use async jobs.",
        code: "TIMEOUT",
      };
    }
    if (err instanceof OHMNetworkError) {
      return {
        ok: false,
        error: "Network error reaching OHM — please retry.",
        code: "NETWORK",
      };
    }
    if (err instanceof OHMServerError) {
      console.error("[ohm] server error", err.code, err.requestId);
      return {
        ok: false,
        error: "Service temporarily unavailable.",
        code: "SERVER",
      };
    }
    console.error("[ohm] unknown error", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "extraction failed",
      code: "UNKNOWN",
    };
  }
}
