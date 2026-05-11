import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AudioRecorderPlayer from "react-native-audio-recorder-player";
import {
  OHM,
  OHMAuthError,
  OHMNetworkError,
  OHMNotFoundError,
  OHMRateLimitError,
  OHMServerError,
  OHMTimeoutError,
  OHMValidationError,
  type AudioExtractResult,
} from "@ohm_studio/sdk-react-native";

// ────────────────────────────────────────────────────────────────────
// Bare RN doesn't natively read .env at build time the way Expo does;
// react-native-config or babel-plugin-dotenv would handle that. To keep
// the demo dependency-light, fill these constants directly. For
// production, hold the live key in YOUR backend and set baseUrl to
// your proxy URL — the SDK supports baseUrl-only init.
// ────────────────────────────────────────────────────────────────────
const TEST_KEY = "ohms_test_replace_me";          // mint at studio.ohm.doctor → Keys
const API_SLUG = "opd-clinic";

const isConfigured = TEST_KEY.startsWith("ohms_test_") && TEST_KEY !== "ohms_test_replace_me";

const ohm = isConfigured
  ? new OHM({
      apiKey: TEST_KEY,
      baseUrl: "https://api.ohm.doctor",
      acknowledgeBundledKey: true, // dev-only override; safe for ohms_test_*
    })
  : null;

async function ensureMicPermission() {
  if (Platform.OS !== "android") return true;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export default function App() {
  if (!isConfigured) return <Setup />;
  return <Recorder />;
}

function Recorder() {
  const arpRef = useRef(new AudioRecorderPlayer());
  const [recording, setRecording] = useState(false);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<AudioExtractResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setError(null);
    setResult(null);
    if (!(await ensureMicPermission())) {
      setError("Microphone permission denied — enable it in Settings.");
      return;
    }
    try {
      await arpRef.current.startRecorder();
      setRecording(true);
    } catch (err: any) {
      setError(err?.message || "Could not start recorder");
    }
  };

  const stop = async () => {
    setRecording(false);
    setWorking(true);
    try {
      const uri = await arpRef.current.stopRecorder();
      // Transcript comes back in English regardless of spoken language.
      const r = await ohm!.audio.extract({
        apiSlug: API_SLUG,
        file: { uri, name: "rec.m4a", type: "audio/mp4" },
      });
      setResult(r);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setWorking(false);
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.h1}>OHM RN SDK · Bare RN demo</Text>
      <Text style={styles.muted}>
        Tap to record. Tap again to stop and extract structured JSON. Uses
        react-native-audio-recorder-player + @ohm_studio/sdk-react-native.
      </Text>
      <Pressable
        onPress={recording ? stop : start}
        disabled={working}
        style={[
          styles.button,
          recording ? styles.buttonRecording : styles.buttonIdle,
        ]}
      >
        {working ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>{recording ? "STOP" : "RECORD"}</Text>
        )}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {result ? (
        <ScrollView style={styles.result}>
          <Text style={styles.label}>Transcript</Text>
          <Text style={styles.transcript}>{result.transcript}</Text>
          <Text style={styles.label}>Structured JSON</Text>
          <Text style={styles.json}>
            {JSON.stringify(result.data, null, 2)}
          </Text>
        </ScrollView>
      ) : null}
    </View>
  );
}

/**
 * Map any OHM error to a one-line, user-actionable message. Replace
 * with your toast/snackbar of choice in a real app — this version
 * focuses on giving the developer something useful to read in the demo.
 */
function messageFor(err: unknown): string {
  if (err instanceof OHMAuthError) {
    return "Authorization failed — check your test-mode API key.";
  }
  if (err instanceof OHMRateLimitError) {
    return `Slow down — try again in ${err.retryAfterSec ?? 60}s.`;
  }
  if (err instanceof OHMValidationError) {
    return `Validation failed${err.fields?.length ? `: ${err.fields.join(", ")}` : ""}.`;
  }
  if (err instanceof OHMNotFoundError) {
    return `API "${API_SLUG}" not found — check API_SLUG in App.tsx.`;
  }
  if (err instanceof OHMTimeoutError) {
    return "Request timed out — try a shorter recording.";
  }
  if (err instanceof OHMNetworkError) {
    return "Network error — check connectivity, then retry.";
  }
  if (err instanceof OHMServerError) {
    return "OHM service is having a moment; please retry.";
  }
  return (err as Error)?.message || "Extraction failed";
}

/**
 * Setup screen shown when TEST_KEY is still the placeholder. Don't
 * crash on bad config — give the developer a 3-step fix.
 */
function Setup() {
  return (
    <View style={[styles.root, styles.setupRoot]}>
      <Text style={styles.h1}>Set up your OHM key</Text>
      <Text style={styles.muted}>
        Open <Text style={styles.code}>App.tsx</Text> and replace the{" "}
        <Text style={styles.code}>TEST_KEY</Text> constant with a real test
        key:
      </Text>
      <View style={styles.codeBlock}>
        <Text style={styles.codeLine}>// in App.tsx, near the top:</Text>
        <Text style={styles.codeLine}>const TEST_KEY = "ohms_test_xxx";</Text>
        <Text style={styles.codeLine}>const API_SLUG = "opd-clinic";</Text>
      </View>
      <Text style={styles.muted}>
        Mint a test key in Studio (Keys tab → New key → Reveal). Live keys
        (ohms_live_*) are rejected — your backend should hold those, never
        the mobile bundle.
      </Text>
      <Pressable
        onPress={() =>
          Linking.openURL("https://docs.ohm.doctor/security/rn-key-handling")
        }
      >
        <Text style={styles.link}>Read the RN key-handling guide ↗</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, paddingTop: 64, backgroundColor: "white" },
  setupRoot: { justifyContent: "center" },
  h1: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  muted: { color: "#475569", marginBottom: 16, lineHeight: 21 },
  code: {
    fontFamily: "Courier",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  codeBlock: {
    backgroundColor: "#0f172a",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  codeLine: {
    color: "#94e2d5",
    fontFamily: "Courier",
    fontSize: 13,
    lineHeight: 20,
  },
  link: { color: "#0f766e", fontWeight: "700", marginTop: 8 },
  button: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  buttonIdle: { backgroundColor: "#0f766e" },
  buttonRecording: { backgroundColor: "#dc2626" },
  buttonText: { color: "white", fontSize: 18, fontWeight: "700" },
  error: { color: "#dc2626", textAlign: "center", marginBottom: 16 },
  result: { flex: 1 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    marginTop: 12,
    marginBottom: 4,
  },
  transcript: {
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
  },
  json: {
    fontFamily: "Courier",
    fontSize: 12,
    backgroundColor: "#0f172a",
    color: "#e2e8f0",
    padding: 12,
    borderRadius: 8,
  },
});
