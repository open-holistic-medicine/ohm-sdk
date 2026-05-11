/**
 * New visit screen.
 *
 * Flow: capture patient details → record consult → useRecorder runs the
 * audio.extract call automatically on stop → save the structured JSON to
 * AsyncStorage → navigate back to the list.
 *
 * `useRecorder` from @ohm_studio/sdk-react-native/react gives us:
 *   - lifecycle (idle/starting/recording/paused/stopping)
 *   - VU meter (linear 0-1) for the live level bar
 *   - duration ticker (seconds)
 *   - automatic audio.extract on stop (because we passed apiSlug)
 *   - typed RecorderError on failure
 */
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Audio } from "expo-av";
import { useRecorder } from "@ohm_studio/sdk-react-native/react";
import {
  SUPPORTED_LANGUAGES,
  type SpeakerMode,
} from "@ohm_studio/sdk-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { saveVisit } from "../lib/storage";
import type { ExtractedVisit } from "../lib/types";

const API_SLUG =
  (process.env.EXPO_PUBLIC_OHM_API_SLUG as string) || "opd-clinic";

type Props = NativeStackScreenProps<RootStackParamList, "NewVisit">;

export function NewVisitScreen({ navigation }: Props) {
  const [patientName, setPatientName] = useState("");
  const [patientId, setPatientId] = useState("");
  const [speakerMode, setSpeakerMode] = useState<SpeakerMode>("doctor_patient");
  const [language, setLanguage] = useState<string>("auto");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [saved, setSaved] = useState(false);

  // speakerMode is collected in the UI but not forwarded by useRecorder
  // — to wire it, call ohm.audio.extract({ apiSlug, file, speakerMode })
  // manually after recorder.stop() instead of using auto-extract.
  const r = useRecorder<ExtractedVisit>({
    audio: Audio,
    apiSlug: API_SLUG,
    extractLanguage: language,
    extractInputs: { patientId, speakerMode },
    silenceAutoStop: { ms: 8000 },
    maxDurationMs: 15 * 60_000,
  });

  const langLabel =
    SUPPORTED_LANGUAGES.find((l) => l.code === language)?.label ?? "Auto-detect";

  const canRecord = patientName.trim() !== "" && patientId.trim() !== "";

  const onSave = async () => {
    if (!r.data || !r.transcript) return;
    await saveVisit({
      id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      patientName: patientName.trim(),
      patientId: patientId.trim(),
      recordedAt: new Date().toISOString(),
      durationSec: r.durationSec,
      speakerMode,
      transcript: r.transcript,
      data: r.data,
    });
    setSaved(true);
    setTimeout(() => navigation.goBack(), 600);
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.section}>Patient</Text>
      <TextInput
        style={styles.input}
        placeholder="Patient name"
        value={patientName}
        onChangeText={setPatientName}
        editable={!r.isRecording && !r.extracting}
      />
      <TextInput
        style={styles.input}
        placeholder="MRN / patient ID"
        value={patientId}
        onChangeText={setPatientId}
        autoCapitalize="characters"
        editable={!r.isRecording && !r.extracting}
      />

      <Text style={styles.section}>Language</Text>
      <Pressable
        disabled={r.isRecording || r.extracting}
        onPress={() => setShowLangPicker((v) => !v)}
        style={styles.langButton}
      >
        <Text style={styles.langLabel}>{langLabel}</Text>
        <Text style={styles.langChevron}>{showLangPicker ? "▲" : "▼"}</Text>
      </Pressable>
      {showLangPicker && (
        <View style={styles.langList}>
          {SUPPORTED_LANGUAGES.map((l) => (
            <Pressable
              key={l.code}
              onPress={() => {
                setLanguage(l.code);
                setShowLangPicker(false);
              }}
              style={[
                styles.langRow,
                language === l.code && styles.langRowActive,
              ]}
            >
              <Text style={styles.langRowLabel}>{l.label}</Text>
              {l.nativeLabel && !l.isAutoDetect && (
                <Text style={styles.langRowNative}> · {l.nativeLabel}</Text>
              )}
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.section}>Speakers</Text>
      <View style={styles.modeRow}>
        {(["doctor", "doctor_patient"] as SpeakerMode[]).map((m) => (
          <Pressable
            key={m}
            disabled={r.isRecording || r.extracting}
            onPress={() => setSpeakerMode(m)}
            style={[
              styles.modeBtn,
              speakerMode === m && styles.modeBtnActive,
            ]}
          >
            <Text
              style={[
                styles.modeLabel,
                speakerMode === m && styles.modeLabelActive,
              ]}
            >
              {m === "doctor" ? "Doctor only" : "Doctor + Patient"}
            </Text>
            <Text style={styles.modeDesc}>
              {m === "doctor"
                ? "Single-speaker dictation"
                : "Two-speaker conversation"}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>Recording</Text>
      <Pressable
        disabled={!canRecord && !r.isRecording}
        onPress={r.isRecording ? r.stop : r.start}
        style={[
          styles.recordBtn,
          !canRecord && !r.isRecording
            ? styles.recordBtnDisabled
            : r.isRecording
              ? styles.recordBtnStop
              : styles.recordBtnGo,
        ]}
      >
        {r.extracting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.recordBtnText}>
            {r.isRecording
              ? `STOP\n${r.durationSec.toFixed(0)}s`
              : "RECORD"}
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

      {!canRecord && !r.isRecording && (
        <Text style={styles.hint}>Enter patient name + MRN to enable.</Text>
      )}

      {r.error ? <Text style={styles.error}>{r.error.message}</Text> : null}
      {r.extractError ? (
        <Text style={styles.error}>{r.extractError.message}</Text>
      ) : null}

      {r.transcript ? (
        <View style={styles.resultBlock}>
          <Text style={styles.label}>Transcript</Text>
          <Text style={styles.transcript}>{r.transcript}</Text>
        </View>
      ) : null}

      {r.data ? (
        <View style={styles.resultBlock}>
          <Text style={styles.label}>Structured JSON</Text>
          <Text style={styles.json}>{JSON.stringify(r.data, null, 2)}</Text>

          <Pressable
            style={[styles.saveBtn, saved && styles.saveBtnDone]}
            disabled={saved}
            onPress={onSave}
          >
            <Text style={styles.saveBtnText}>
              {saved ? "Saved ✓" : "Save to local EMR"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16, paddingBottom: 64 },
  section: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 15,
    marginBottom: 8,
  },
  langButton: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  langLabel: { fontSize: 15, color: "#1e293b" },
  langChevron: { color: "#64748b", fontSize: 12 },
  langList: {
    marginTop: 4,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    maxHeight: 240,
    overflow: "hidden",
  },
  langRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    flexDirection: "row",
    alignItems: "center",
  },
  langRowActive: { backgroundColor: "#ecfdf5" },
  langRowLabel: { fontSize: 14, color: "#1e293b" },
  langRowNative: { fontSize: 13, color: "#64748b" },

  modeRow: { flexDirection: "row", gap: 8 },
  modeBtn: {
    flex: 1,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    borderRadius: 10,
  },
  modeBtnActive: { borderColor: "#0f766e", backgroundColor: "#ecfdf5" },
  modeLabel: { fontSize: 14, fontWeight: "600", color: "#1e293b" },
  modeLabelActive: { color: "#0f766e" },
  modeDesc: { fontSize: 11, color: "#64748b", marginTop: 2 },

  recordBtn: {
    height: 120,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  recordBtnGo: { backgroundColor: "#0f766e" },
  recordBtnStop: { backgroundColor: "#dc2626" },
  recordBtnDisabled: { backgroundColor: "#cbd5e1" },
  recordBtnText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },

  vuTrack: {
    height: 6,
    backgroundColor: "#e2e8f0",
    borderRadius: 3,
    marginTop: 8,
    overflow: "hidden",
  },
  vuFill: { height: "100%", backgroundColor: "#10b981" },

  hint: { color: "#64748b", fontSize: 12, marginTop: 8, textAlign: "center" },
  error: { color: "#dc2626", marginTop: 12, textAlign: "center" },

  resultBlock: { marginTop: 24 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  transcript: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
    color: "#1e293b",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  json: {
    fontFamily: "Courier",
    fontSize: 11,
    backgroundColor: "#0f172a",
    color: "#e2e8f0",
    padding: 12,
    borderRadius: 10,
  },
  saveBtn: {
    backgroundColor: "#0f766e",
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  saveBtnDone: { backgroundColor: "#16a34a" },
  saveBtnText: { color: "white", fontWeight: "700", fontSize: 15 },
});
