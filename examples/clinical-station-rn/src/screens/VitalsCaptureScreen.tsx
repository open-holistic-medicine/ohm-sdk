/**
 * Vitals capture — the canonical "sync extract" demo.
 *
 * SDK features used here:
 *   • useRecorder({ apiSlug, audio, silenceAutoStop, maxDurationMs })
 *   • Auto-extract via OhmProvider on stop()
 *   • Live VU meter (r.level) + duration (r.durationSec)
 *   • Typed error surface (r.error / r.extractError) → ErrorBanner
 *   • Patient hash + recordedById flow through inputs (audit trail)
 */
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import { useRecorder } from "@ohm_studio/sdk-react-native/react";
import { SLUG } from "../lib/ohm-client";
import { theme } from "../lib/theme";
import type { CaptureMode, VitalsRecord } from "../lib/types";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ErrorBanner } from "../components/ErrorBanner";
import { MicButton } from "../components/MicButton";
import { PatientHeader } from "../components/PatientHeader";
import { toFriendlyError } from "../lib/errors";
import { demoPatientHash } from "../lib/format";

export interface VitalsCaptureScreenProps {
  patient: { id: string; name: string; bedNumber?: string };
  recordedBy: { id: string; name: string };
  onSave: (record: VitalsRecord) => void | Promise<void>;
  onClose: () => void;
}

interface ExtractedVitals {
  temperature?: number;
  pulse?: number;
  respiratoryRate?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  spo2?: number;
  painScore?: number;
}

const blankForm = {
  temperature: "",
  pulse: "",
  respiratoryRate: "",
  bpSystolic: "",
  bpDiastolic: "",
  spo2: "",
  painScore: "",
};

export function VitalsCaptureScreen(props: VitalsCaptureScreenProps) {
  const [mode, setMode] = useState<CaptureMode>("idle");
  const [form, setForm] = useState(blankForm);

  const r = useRecorder<ExtractedVitals>({
    audio: Audio,
    apiSlug: SLUG.vitals,
    extractLanguage: "auto",
    extractInputs: {
      patientHash: demoPatientHash(props.patient.id),
      recordedById: props.recordedBy.id,
    },
    silenceAutoStop: { ms: 6000 },
    maxDurationMs: 5 * 60_000,
  });

  useEffect(() => {
    if (!r.data) return;
    setForm({
      temperature: numStr(r.data.temperature),
      pulse: intStr(r.data.pulse),
      respiratoryRate: intStr(r.data.respiratoryRate),
      bpSystolic: intStr(r.data.bpSystolic),
      bpDiastolic: intStr(r.data.bpDiastolic),
      spo2: intStr(r.data.spo2),
      painScore: intStr(r.data.painScore),
    });
    setMode("review");
  }, [r.data]);

  const start = async () => {
    setMode("recording");
    await r.start();
  };
  const stop = async () => {
    setMode("extracting");
    await r.stop();
  };
  const reRecord = () => {
    setMode("idle");
    r.reset();
    setForm(blankForm);
  };
  const save = async () => {
    const record: VitalsRecord = {
      id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      temperature: parseNum(form.temperature),
      pulse: parseInt2(form.pulse),
      respiratoryRate: parseInt2(form.respiratoryRate),
      bpSystolic: parseInt2(form.bpSystolic),
      bpDiastolic: parseInt2(form.bpDiastolic),
      spo2: parseInt2(form.spo2),
      painScore: parseInt2(form.painScore),
      recordedAt: new Date().toISOString(),
      recordedBy: props.recordedBy.name,
    };
    await props.onSave(record);
    props.onClose();
  };

  const friendly =
    r.error || r.extractError
      ? toFriendlyError(r.extractError ?? r.error)
      : null;

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <PatientHeader
        title={mode === "review" ? "Review vitals" : "Record vitals"}
        subtitle={`Bed ${props.patient.bedNumber ?? "—"} · ${props.patient.name}`}
        onClose={props.onClose}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {mode !== "review" && (
          <View style={s.recordPanel}>
            <MicButton
              state={
                mode === "extracting"
                  ? "extracting"
                  : r.isRecording
                    ? "recording"
                    : "idle"
              }
              level={r.level}
              durationSec={r.durationSec}
              hint={
                r.isRecording
                  ? "Auto-stops after 6 s of silence · 5 min cap"
                  : "Tap to dictate vitals · auto-stops after 6 s of silence"
              }
              onPress={r.isRecording ? stop : start}
            />
            <Card compact style={{ marginTop: 24, width: "100%" }}>
              {r.transcript ? (
                <Text style={s.transcriptText} numberOfLines={6}>
                  {r.transcript}
                </Text>
              ) : (
                <View>
                  <Text style={s.hintHead}>How to record</Text>
                  <Text style={s.hintBody}>
                    Tap the mic, then say each vital you took. Order doesn't
                    matter — skip any you didn't measure.
                  </Text>
                  <Text style={s.hintExampleLabel}>Example</Text>
                  <Text style={s.hintExample}>
                    "Temperature 99.1, pulse 92, RR 18, BP 130 over 85,
                    SpO₂ 97 on room air, pain score 3 out of 10."
                  </Text>
                </View>
              )}
            </Card>

            {friendly && (
              <View style={{ width: "100%", marginTop: 12 }}>
                <ErrorBanner
                  message={friendly.body}
                  code={friendly.code}
                  hint={friendly.hint}
                />
              </View>
            )}

            <View style={{ marginTop: theme.space.xl }}>
              <Button
                label="Enter manually instead"
                variant="ghost"
                onPress={() => setMode("review")}
                disabled={r.isRecording || mode === "extracting"}
              />
            </View>
          </View>
        )}

        {mode === "review" && (
          <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
            <Row>
              <Field
                label="Temperature (°F)"
                value={form.temperature}
                onChange={(v) => setForm((f) => ({ ...f, temperature: v }))}
                placeholder="98.6"
                keyboardType="decimal-pad"
              />
              <Field
                label="Pulse (bpm)"
                value={form.pulse}
                onChange={(v) => setForm((f) => ({ ...f, pulse: v }))}
                placeholder="88"
                keyboardType="number-pad"
              />
            </Row>
            <Row>
              <Field
                label="Resp rate (/min)"
                value={form.respiratoryRate}
                onChange={(v) => setForm((f) => ({ ...f, respiratoryRate: v }))}
                placeholder="18"
                keyboardType="number-pad"
              />
              <Field
                label="SpO₂ (%)"
                value={form.spo2}
                onChange={(v) => setForm((f) => ({ ...f, spo2: v }))}
                placeholder="97"
                keyboardType="number-pad"
              />
            </Row>
            <Text style={s.fieldLabel}>Blood pressure (mmHg)</Text>
            <View style={s.bpRow}>
              <TextInput
                style={s.input}
                value={form.bpSystolic}
                onChangeText={(v) => setForm((f) => ({ ...f, bpSystolic: v }))}
                placeholder="Systolic"
                placeholderTextColor={theme.color.textFaint}
                keyboardType="number-pad"
              />
              <Text style={s.bpSlash}>/</Text>
              <TextInput
                style={s.input}
                value={form.bpDiastolic}
                onChangeText={(v) => setForm((f) => ({ ...f, bpDiastolic: v }))}
                placeholder="Diastolic"
                placeholderTextColor={theme.color.textFaint}
                keyboardType="number-pad"
              />
            </View>
            <Field
              label="Pain score (0–10)"
              value={form.painScore}
              onChange={(v) => setForm((f) => ({ ...f, painScore: v }))}
              placeholder="3"
              keyboardType="number-pad"
            />

            {r.transcript && (
              <Card title="What you said" style={{ marginTop: 16 }} compact>
                <Text style={s.transcript}>{r.transcript}</Text>
              </Card>
            )}
          </ScrollView>
        )}

        {mode === "review" && (
          <View style={s.actionsBar}>
            <View style={{ flex: 1 }}>
              <Button label="Re-record" variant="secondary" onPress={reRecord} fullWidth />
            </View>
            <View style={{ flex: 1.6 }}>
              <Button label="Save vitals" onPress={save} fullWidth />
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={s.row}>{children}</View>;
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: "decimal-pad" | "number-pad";
}) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{props.label}</Text>
      <TextInput
        style={s.input}
        value={props.value}
        onChangeText={props.onChange}
        placeholder={props.placeholder}
        placeholderTextColor={theme.color.textFaint}
        keyboardType={props.keyboardType ?? "default"}
      />
    </View>
  );
}

const numStr = (v: number | undefined) =>
  typeof v === "number" && Number.isFinite(v) ? String(v) : "";
const intStr = (v: number | undefined) =>
  typeof v === "number" && Number.isFinite(v) ? String(Math.round(v)) : "";
const parseNum = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
};
const parseInt2 = (v: string) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },

  recordPanel: {
    flex: 1,
    backgroundColor: theme.color.canvas,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.space.xl,
  },
  transcriptText: {
    color: theme.color.text,
    fontSize: 15,
    lineHeight: 22,
  },

  // Pre-recording hint — distinct from the actual transcript so the
  // user can immediately tell "this is helper text" vs "this is what I
  // said". Removed the old numberOfLines clip; the hint now shows fully.
  hintHead: {
    ...theme.font.label,
    color: theme.color.textMuted,
    marginBottom: 8,
  },
  hintBody: {
    fontSize: 15,
    color: theme.color.text,
    lineHeight: 22,
    marginBottom: 14,
  },
  hintExampleLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.color.primary,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  hintExample: {
    fontSize: 14,
    color: theme.color.textMuted,
    lineHeight: 21,
    fontStyle: "italic",
  },

  scroll: { flex: 1, backgroundColor: theme.color.surface },
  scrollContent: { padding: theme.space.lg, paddingBottom: 96 },
  row: { flexDirection: "row", gap: theme.space.md, marginBottom: theme.space.md },
  field: { flex: 1 },
  fieldLabel: {
    ...theme.font.label,
    color: theme.color.textMuted,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.line,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: theme.color.text,
    flex: 1,
  },
  bpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.md,
    marginBottom: theme.space.md,
  },
  bpSlash: { fontSize: 24, fontWeight: "700", color: theme.color.textFaint },

  transcript: {
    backgroundColor: theme.color.canvas,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    fontSize: 14,
    color: theme.color.text,
    lineHeight: 21,
  },

  actionsBar: {
    flexDirection: "row",
    gap: theme.space.md,
    padding: theme.space.lg,
    borderTopWidth: 1,
    borderTopColor: theme.color.line,
    backgroundColor: theme.color.surface,
  },
});
