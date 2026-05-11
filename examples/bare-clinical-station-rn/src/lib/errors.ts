/**
 * Map any thrown OHM error to a friendly { title, body, hint } trio
 * the UI can render in <ErrorBanner />. Centralised so screens don't
 * have to repeat instanceof ladders.
 */
import {
  OHMAbortError,
  OHMAuthError,
  OHMConfigError,
  OHMError,
  OHMNetworkError,
  OHMNotFoundError,
  OHMQuotaExceededError,
  OHMRateLimitError,
  OHMServerError,
  OHMTimeoutError,
  OHMValidationError,
} from "@ohm_studio/sdk-react-native";

export interface FriendlyError {
  code: string;
  title: string;
  body: string;
  hint?: string;
}

export function toFriendlyError(e: unknown): FriendlyError {
  if (e instanceof OHMAuthError) {
    return {
      code: "auth_error",
      title: "Authentication failed",
      body: e.message,
      hint: "Mint a fresh ohms_test_* key in Studio → Keys.",
    };
  }
  if (e instanceof OHMRateLimitError) {
    return {
      code: "rate_limited",
      title: "Rate limited",
      body: e.message,
      hint: e.retryAfterSec ? `Retry in ~${e.retryAfterSec}s.` : "Slow your call rate.",
    };
  }
  if (e instanceof OHMValidationError) {
    return {
      code: "validation_error",
      title: "Validation failed",
      body: e.message,
      hint: e.fields?.length
        ? `Fields: ${e.fields.join(", ")}`
        : "Adjust the inputs and re-run.",
    };
  }
  if (e instanceof OHMQuotaExceededError) {
    return {
      code: "quota_exceeded",
      title: "Quota exceeded",
      body: e.message,
      hint: "Contact your org admin to lift the cap.",
    };
  }
  if (e instanceof OHMNotFoundError) {
    return {
      code: "not_found",
      title: "Not found",
      body: e.message,
      hint: "Check the apiSlug — it must match a Published API.",
    };
  }
  if (e instanceof OHMTimeoutError) {
    return {
      code: "timeout",
      title: "Request timed out",
      body: e.message,
      hint: "Re-run, or switch to async jobs for >30s payloads.",
    };
  }
  if (e instanceof OHMNetworkError) {
    return {
      code: "network_error",
      title: "Network error",
      body: e.message,
      hint: "The call has been queued — it will replay when you're back online.",
    };
  }
  if (e instanceof OHMAbortError) {
    return { code: "aborted", title: "Cancelled", body: e.message };
  }
  if (e instanceof OHMConfigError) {
    return {
      code: "config_error",
      title: "Misconfiguration",
      body: e.message,
      hint: "Use ohms_test_* keys in mobile bundles. Live keys go in your backend.",
    };
  }
  if (e instanceof OHMServerError) {
    return {
      code: "server_error",
      title: e.status >= 500 ? "Server error" : `HTTP ${e.status}`,
      body: e.message,
    };
  }
  if (e instanceof OHMError) {
    return { code: e.code, title: e.code, body: e.message };
  }
  return {
    code: "unknown",
    title: "Unexpected error",
    body: (e as Error)?.message ?? String(e),
  };
}
