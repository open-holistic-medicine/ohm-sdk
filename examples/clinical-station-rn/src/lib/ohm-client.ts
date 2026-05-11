/**
 * Single OHM client for the whole app. Imported by every screen.
 *
 *   import { ohm, SLUG, isConfigured } from "../lib/ohm-client";
 *
 * For PRODUCTION builds, swap `apiKey` for `baseUrl: 'https://your-backend.example.com'`
 * pointing at YOUR backend's proxy endpoints. Your backend holds the
 * `ohms_live_*` key in its secrets manager and forwards to OHM. Never
 * ship a live key in an Expo / RN bundle — anyone can decompile your
 * app and steal it.
 *
 * IMPORTANT — lazy init:
 *   We DON'T throw on a missing key at module-load time. A throw at
 *   import would crash the JS bundle silently — Metro shows "loading"
 *   forever and the user sees no error screen. Instead we keep `ohm`
 *   nullable and expose `isConfigured` so App.tsx can render a
 *   friendly setup-screen with copy-paste instructions when the .env
 *   isn't filled in yet.
 */
import { OHM } from "@ohm_studio/sdk-react-native";

const apiKey = process.env.EXPO_PUBLIC_OHM_API_KEY;
const baseUrl =
  process.env.EXPO_PUBLIC_OHM_BASE_URL || "https://api.ohm.doctor";

/** True when EXPO_PUBLIC_OHM_API_KEY is set to something usable. */
export const isConfigured = !!apiKey && apiKey.startsWith("ohms_");

/**
 * The OHM client. `null` until `.env` is filled in — App.tsx checks
 * `isConfigured` first and renders a setup screen otherwise. Once the
 * key is present this is a fully-initialised OHM instance.
 */
export const ohm = isConfigured
  ? new OHM({
      apiKey: apiKey!,
      baseUrl,
      // Test keys (ohms_test_*) only — live keys (ohms_live_*) are
      // rejected by the SDK in RN builds. See:
      //   https://docs.ohm.doctor/security/rn-key-handling
      acknowledgeBundledKey: false,
    })
  : null;

/** Slugs as set in Studio. Override per-deployment via env vars. */
export const SLUG = {
  vitals:
    process.env.EXPO_PUBLIC_OHM_VITALS_SLUG ?? "inpatient-vitals",
  doctorNote:
    process.env.EXPO_PUBLIC_OHM_DOCTOR_NOTE_SLUG ?? "inpatient-doctor-note",
  nurseShift:
    process.env.EXPO_PUBLIC_OHM_NURSE_SHIFT_SLUG ?? "nurse-shift-handover",
};
