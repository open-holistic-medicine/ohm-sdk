import { useMemo } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Audio } from "expo-av";
import { OHM } from "@ohm_studio/sdk-react-native";
import { OhmProvider, useRecorder } from "@ohm_studio/sdk-react-native/react";

/**
 * Smallest-possible OHM RN SDK demo: one screen, one mic button, auto-
 * extract on stop.
 *
 * Live keys (ohms_live_*) are rejected in RN bundles by default — anyone
 * who unzips your APK/IPA can read them. The demo uses a test key
 * (ohms_test_*) and `acknowledgeBundledKey: true`. For production, hold
 * the live key in YOUR backend and set baseUrl to your proxy.
 */
const TEST_KEY = process.env.EXPO_PUBLIC_OHM_TEST_KEY;
const API_SLUG = process.env.EXPO_PUBLIC_OHM_API_SLUG ?? "opd-clinic";

const isConfigured = !!TEST_KEY && TEST_KEY.startsWith("ohms_test_");

export default function App() {
  if (!isConfigured) return <Setup />;

  // Hooks below run only when configured — `TEST_KEY` is non-null here
  // (validated by `isConfigured` above) so the cast is safe.
  return <Configured apiKey={TEST_KEY as string} />;
}

function Configured({ apiKey }: { apiKey: string }) {
  const ohm = useMemo(
    () =>
      new OHM({
        apiKey,
        baseUrl: "https://api.ohm.doctor",
        acknowledgeBundledKey: true, // dev-only override; safe for ohms_test_*
      }),
    [apiKey],
  );

  return (
    <OhmProvider client={ohm}>
      <Inner />
    </OhmProvider>
  );
}

function Inner() {
  const r = useRecorder({
    audio: Audio,
    apiSlug: API_SLUG,                 // auto-extracts on stop
    silenceAutoStop: { ms: 8000 },
    maxDurationMs: 15 * 60_000,
  });

  return (
    <View style={styles.root}>
      <Text style={styles.h1}>OHM RN SDK demo</Text>
      <Text style={styles.muted}>
        Tap to record. Auto-stops after 8 s of silence or 15 min. The hook
        handles mic permission, iOS audio session, AAC encoding, and the
        audio.extract call.
      </Text>
      <Pressable
        onPress={r.isRecording ? r.stop : r.start}
        disabled={r.extracting}
        style={[
          styles.button,
          r.isRecording ? styles.buttonRecording : styles.buttonIdle,
          r.extracting ? styles.buttonBusy : null,
        ]}
      >
        {r.extracting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>
            {r.isRecording ? `STOP\n${r.durationSec.toFixed(0)}s` : "RECORD"}
          </Text>
        )}
      </Pressable>

      {r.isRecording ? (
        <View style={styles.vuTrack}>
          <View
            style={[
              styles.vuFill,
              { width: `${Math.min(100, r.level * 400)}%` },
            ]}
          />
        </View>
      ) : null}

      {r.error ? <Text style={styles.error}>{r.error.message}</Text> : null}
      {r.extractError ? (
        <Text style={styles.error}>{r.extractError.message}</Text>
      ) : null}

      {r.transcript || r.data ? (
        <ScrollView style={styles.result}>
          {r.transcript ? (
            <>
              <Text style={styles.label}>Transcript</Text>
              <Text style={styles.transcript}>{r.transcript}</Text>
            </>
          ) : null}
          {r.data ? (
            <>
              <Text style={styles.label}>Structured JSON</Text>
              <Text style={styles.json}>
                {JSON.stringify(r.data, null, 2)}
              </Text>
            </>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
}

/**
 * Setup screen — shown when EXPO_PUBLIC_OHM_TEST_KEY is missing or
 * doesn't start with "ohms_test_". Don't crash on bad config — give
 * the developer a 3-step fix.
 */
function Setup() {
  return (
    <View style={[styles.root, styles.setupRoot]}>
      <Text style={styles.h1}>Set up your OHM key</Text>
      <Text style={styles.muted}>
        Add a test-mode key to <Text style={styles.code}>.env</Text> in this
        project root, then restart Expo with the cache cleared:
      </Text>
      <View style={styles.codeBlock}>
        <Text style={styles.codeLine}>cp .env.example .env</Text>
        <Text style={styles.codeLine}>
          {`# edit .env: EXPO_PUBLIC_OHM_TEST_KEY=ohms_test_xxx`}
        </Text>
        <Text style={styles.codeLine}>npx expo start --clear</Text>
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
    marginBottom: 16,
  },
  buttonIdle: { backgroundColor: "#0f766e" },
  buttonRecording: { backgroundColor: "#dc2626" },
  buttonBusy: { opacity: 0.7 },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  vuTrack: {
    height: 6,
    backgroundColor: "#e2e8f0",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 16,
  },
  vuFill: { height: "100%", backgroundColor: "#10b981" },
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
