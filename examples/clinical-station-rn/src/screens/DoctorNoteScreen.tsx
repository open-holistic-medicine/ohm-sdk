/**
 * Doctor note — sync recorder, two-field markdown extraction.
 * Mirrors the API doctor-note schema's `content` + `plan` outputs.
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
import type { CaptureMode, DoctorNote } from "../lib/types";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ErrorBanner } from "../components/ErrorBanner";
import { MicButton } from "../components/MicButton";
import { PatientHeader } from "../components/PatientHeader";
import { toFriendlyError } from "../lib/errors";
import { demoPatientHash } from "../lib/format";

export interface DoctorNoteScreenProps {
  patient: { id: string; name: string; bedNumber?: string };
  author: { id: string; name: string };
  onSave: (note: DoctorNote) => void | Promise<void>;
  onClose: () => void;
}

interface ExtractedDoctorNote {
  content?: string | { markdown: string };
  plan?: string | { markdown: string };
}

const md = (v: string | { markdown: string } | undefined) =>
  typeof v === "string" ? v : v?.markdown ?? "";

export function DoctorNoteScreen(props: DoctorNoteScreenProps) {
  const [mode, setMode] = useState<CaptureMode>("idle");
  const [content, setContent] = useState("");
  const [plan, setPlan] = useState("");

  const r = useRecorder<ExtractedDoctorNote>({
    audio: Audio,
    apiSlug: SLUG.doctorNote,
    extractLanguage: "auto",
    extractInputs: {
      patientHash: demoPatientHash(props.patient.id),
      recordedById: props.author.id,
    },
    silenceAutoStop: { ms: 8000 },
    maxDurationMs: 10 * 60_000,
  });

  useEffect(() => {
    if (!r.data) return;
    setContent(md(r.data.content));
    setPlan(md(r.data.plan));
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
    setContent("");
    setPlan("");
  };
  const save = async () => {
    if (!content.trim()) return;
    const note: DoctorNote = {
      id: `dn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      authorId: props.author.id,
      authorName: props.author.name,
      content: content.trim(),
      plan: plan.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    await props.onSave(note);
    props.onClose();
  };

  const friendly =
    r.error || r.extractError ? toFriendlyError(r.extractError ?? r.error) : null;

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <PatientHeader
        title={mode === "review" ? "Review note" : "New doctor note"}
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
                  ? "Auto-stops after 8 s of silence · 10 min cap"
                  : "Tap to dictate · say \"plan\" before the next-step actions"
              }
              onPress={r.isRecording ? stop : start}
            />
            <Card compact style={{ marginTop: 24, width: "100%" }}>
              {r.transcript ? (
                <Text style={s.transcriptText} numberOfLines={8}>
                  {r.transcript}
                </Text>
              ) : (
                <View>
                  <Text style={s.hintHead}>How to dictate</Text>
                  <Text style={s.hintBody}>
                    Speak observations first, then say "plan" and dictate
                    next steps. The screen splits them into two fields
                    automatically.
                  </Text>
                  <Text style={s.hintExampleLabel}>Example</Text>
                  <Text style={s.hintExample}>
                    "Day 2 post-op, pain reduced 6 to 3, no fresh chest
                    pain, wound clean. Plan — continue Augmentin 125 mg
                    BD for 2 more days, repeat CBC tomorrow, follow up in
                    3 days."
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
                label="Type manually instead"
                variant="ghost"
                onPress={() => setMode("review")}
                disabled={r.isRecording || mode === "extracting"}
              />
            </View>
          </View>
        )}

        {mode === "review" && (
          <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
            <Text style={s.sectionLabel}>Note (observations / assessment)</Text>
            <TextInput
              style={[s.input, s.multiline]}
              value={content}
              onChangeText={setContent}
              placeholder={`- Day 2 post-op\n- Pain reduced 6 → 3\n- No fresh chest pain`}
              placeholderTextColor={theme.color.textFaint}
              multiline
              textAlignVertical="top"
            />

            <Text style={[s.sectionLabel, { marginTop: 16 }]}>Plan</Text>
            <TextInput
              style={[s.input, s.multiline]}
              value={plan}
              onChangeText={setPlan}
              placeholder={`- Continue Augmentin 125mg BD x 2 more days\n- Repeat CBC tomorrow`}
              placeholderTextColor={theme.color.textFaint}
              multiline
              textAlignVertical="top"
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
              <Button
                label="Save note"
                onPress={save}
                fullWidth
                disabled={!content.trim()}
              />
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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

  // Pre-recording hint — distinct visual from a real transcript.
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
  sectionLabel: {
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
    lineHeight: 22,
  },
  multiline: { minHeight: 160 },

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
