/**
 * useBareRecorder — drop-in bare-RN replacement for the SDK's Expo
 * `useRecorder` hook. Same returned shape so screen code is identical.
 *
 * Backend: `BareRecorder` (from the SDK, wraps
 * `react-native-audio-recorder-player`) + `ohm.audio.extract(...)` from
 * the shared client.
 *
 * API parity with @ohm_studio/sdk-react-native/react's useRecorder:
 *
 *   const r = useBareRecorder<T>({
 *     apiSlug,
 *     extractLanguage?,
 *     extractInputs?,
 *     silenceAutoStop?: { ms },
 *     maxDurationMs?,
 *     speakerMode?,
 *   });
 *
 *   r.start() / r.stop() / r.reset()
 *   r.isRecording, r.level, r.durationSec
 *   r.transcript, r.data
 *   r.error          — recording-side error
 *   r.extractError   — server-side extraction error
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import AudioRecorderPlayer from "react-native-audio-recorder-player";
import { BareRecorder, type BareRecorderOptions } from "@ohm_studio/sdk-react-native";
import { ohm } from "../lib/ohm-client";

/** Pre-emptively request Android RECORD_AUDIO so the OS dialog appears
 *  when the screen mounts, not on the first "Record" tap (which would
 *  otherwise cost the user an extra tap). iOS handles this automatically
 *  via NSMicrophoneUsageDescription in Info.plist. */
async function ensureAndroidMicPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  try {
    const already = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );
    if (already) return true;
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: "Microphone access",
        message:
          "Clinical Station needs the microphone to record voice notes for transcription.",
        buttonPositive: "Allow",
        buttonNegative: "Not now",
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

export interface UseBareRecorderOptions {
  apiSlug: string;
  extractLanguage?: string;
  extractInputs?: Record<string, unknown>;
  speakerMode?: "doctor" | "doctor_patient";
  silenceAutoStop?: BareRecorderOptions["silenceAutoStop"];
  maxDurationMs?: BareRecorderOptions["maxDurationMs"];
}

export interface UseBareRecorderReturn<T> {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  reset: () => void;
  isRecording: boolean;
  level: number;
  durationSec: number;
  transcript?: string;
  data?: T;
  error?: Error;
  extractError?: Error;
}

export function useBareRecorder<T = Record<string, unknown>>(
  opts: UseBareRecorderOptions,
): UseBareRecorderReturn<T> {
  const [isRecording, setIsRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [transcript, setTranscript] = useState<string | undefined>();
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<Error | undefined>();
  const [extractError, setExtractError] = useState<Error | undefined>();

  // Keep the latest extraction options around so async stop() can read
  // the freshest values without recreating the recorder.
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const recRef = useRef<BareRecorder | null>(null);

  // Probe Android mic permission once on mount so the OS dialog appears
  // up front, not on the first tap of the Record button. No-op on iOS.
  useEffect(() => {
    void ensureAndroidMicPermission();
  }, []);

  const ensureRecorder = useCallback(() => {
    if (recRef.current) return recRef.current;
    // The SDK's BareRecorder was written against react-native-audio-recorder-player
    // v3-era types where setSubscriptionDuration returned Promise<unknown>. v4
    // returns void synchronously. Runtime is fine — the cast just satisfies
    // TypeScript while keeping us on a maintained recorder release.
    recRef.current = new BareRecorder(
      AudioRecorderPlayer as unknown as ConstructorParameters<typeof BareRecorder>[0],
      {
        silenceAutoStop: opts.silenceAutoStop,
        maxDurationMs: opts.maxDurationMs,
        onLevel: (lvl: number) => setLevel(lvl),
        // BareRecorder emits durationMillis through onStatus, not a dedicated
        // onDuration. We surface seconds for parity with the Expo useRecorder.
        onStatus: (st: { durationMillis: number }) =>
          setDurationSec(st.durationMillis / 1000),
      },
    );
    return recRef.current;
  }, [opts.silenceAutoStop, opts.maxDurationMs]);

  const reset = useCallback(() => {
    setTranscript(undefined);
    setData(undefined);
    setError(undefined);
    setExtractError(undefined);
    setLevel(0);
    setDurationSec(0);
    setIsRecording(false);
  }, []);

  const start = useCallback(async () => {
    setError(undefined);
    setExtractError(undefined);
    setTranscript(undefined);
    setData(undefined);
    setLevel(0);
    setDurationSec(0);
    // Re-check at start() in case the user denied the prompt earlier or
    // mounted the screen offline. iOS short-circuits to true.
    const granted = await ensureAndroidMicPermission();
    if (!granted) {
      setError(
        new Error("Microphone permission denied — enable it in Settings."),
      );
      return;
    }
    try {
      const r = ensureRecorder();
      await r.start();
      setIsRecording(true);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setIsRecording(false);
    }
  }, [ensureRecorder]);

  const stop = useCallback(async () => {
    const r = recRef.current;
    if (!r) return;
    let file: { uri: string; name: string; type: string } | undefined;
    try {
      const stopped = await r.stop();
      // r.stop() returns the recorded `RNFile`. Coerce through unknown so
      // the local narrow type lines up — at runtime it's always { uri, name, type }.
      file = stopped as unknown as typeof file;
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setIsRecording(false);
      return;
    }
    setIsRecording(false);
    if (!file) return;
    // The OHM client is only created when an API key is present (see
    // src/lib/ohm-client.ts). The recorder UI is gated by `isConfigured`,
    // so by the time stop() runs `ohm` is guaranteed non-null — but we
    // still null-check for TypeScript.
    if (!ohm) {
      setExtractError(
        new Error("OHM client is not configured. Set an API key in .env."),
      );
      return;
    }
    try {
      const { apiSlug, extractLanguage, extractInputs, speakerMode } =
        optsRef.current;
      const result = await ohm.audio.extract({
        apiSlug,
        file: file as Parameters<typeof ohm.audio.extract>[0]["file"],
        language: extractLanguage as never,
        inputs: extractInputs,
        speakerMode,
      });
      // Surface `transcript` + `data` with the same shape the Expo
      // useRecorder hook returns.
      setTranscript((result as { transcript?: string }).transcript);
      setData((result as { data?: T }).data);
    } catch (e) {
      setExtractError(e instanceof Error ? e : new Error(String(e)));
    }
  }, []);

  // Cleanup on unmount — abort any in-progress recording.
  useEffect(() => {
    return () => {
      const r = recRef.current;
      if (r) {
        try {
          void r.stop().catch(() => {});
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  return useMemo(
    () => ({
      start,
      stop,
      reset,
      isRecording,
      level,
      durationSec,
      transcript,
      data,
      error,
      extractError,
    }),
    [
      start,
      stop,
      reset,
      isRecording,
      level,
      durationSec,
      transcript,
      data,
      error,
      extractError,
    ],
  );
}
