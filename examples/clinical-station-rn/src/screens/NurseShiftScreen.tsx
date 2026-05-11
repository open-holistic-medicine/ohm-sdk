/**
 * Nurse-shift handover — sync recorder, three coordinated structures
 * (SOAP / timeline / ISBARR) extracted from one dictation.
 */
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import { useRecorder } from "@ohm_studio/sdk-react-native/react";
import { SLUG } from "../lib/ohm-client";
import { theme } from "../lib/theme";
import type { CaptureMode, NurseShiftHandover, ShiftSlot } from "../lib/types";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ErrorBanner } from "../components/ErrorBanner";
import { MicButton } from "../components/MicButton";
import { PatientHeader } from "../components/PatientHeader";
import { toFriendlyError } from "../lib/errors";
import { demoPatientHash } from "../lib/format";

export interface NurseShiftScreenProps {
  patient: { id: string; name: string; bedNumber?: string };
  nurse: { id: string; name: string };
  shift: ShiftSlot;
  shiftDate: string;
  onSave: (handover: NurseShiftHandover) => void | Promise<void>;
  onClose: () => void;
}

interface ExtractedShift {
  soapSubjective?: string | { markdown: string };
  soapObjective?: string | { markdown: string };
  soapGoal?: string;
  timeline?: Array<{
    time?: string;
    type?: "progress" | "education";
    text?: string;
  }>;
  isbarrSituation?: string;
  isbarrBackground?: string;
  isbarrAssessment?: string;
  isbarrRecommendation?: string;
  isbarrReassessment?: string;
}

const md = (v: string | { markdown: string } | undefined) =>
  typeof v === "string" ? v : v?.markdown ?? "";

export function NurseShiftScreen(props: NurseShiftScreenProps) {
  const [mode, setMode] = useState<CaptureMode>("idle");
  const [extracted, setExtracted] = useState<ExtractedShift | null>(null);

  const r = useRecorder<ExtractedShift>({
    audio: Audio,
    apiSlug: SLUG.nurseShift,
    extractLanguage: "auto",
    extractInputs: {
      patientHash: demoPatientHash(props.patient.id),
      recordedById: props.nurse.id,
    },
    silenceAutoStop: { ms: 10_000 },
    maxDurationMs: 15 * 60_000,
  });

  useEffect(() => {
    if (!r.data) return;
    setExtracted(r.data);
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
    setExtracted(null);
  };
  const submit = async () => {
    if (!extracted) return;
    const handover: NurseShiftHandover = {
      id: `sh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      nurseId: props.nurse.id,
      nurseName: props.nurse.name,
      shift: props.shift,
      shiftDate: props.shiftDate,
      soap: {
        subjective: md(extracted.soapSubjective),
        objective: md(extracted.soapObjective),
        goal: extracted.soapGoal ?? "",
      },
      timeline: (extracted.timeline ?? [])
        .filter((e) => e.time && e.text)
        .map((e, i) => ({
          id: `t_${Date.now()}_${i}`,
          time: e.time!,
          type: e.type ?? "progress",
          text: e.text!,
        })),
      isbarr: {
        situation: extracted.isbarrSituation ?? "",
        background: extracted.isbarrBackground ?? "",
        assessment: extracted.isbarrAssessment ?? "",
        recommendation: extracted.isbarrRecommendation ?? "",
        reassessment: extracted.isbarrReassessment ?? "",
      },
      createdAt: new Date().toISOString(),
    };
    await props.onSave(handover);
    props.onClose();
  };

  const friendly =
    r.error || r.extractError ? toFriendlyError(r.extractError ?? r.error) : null;

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <PatientHeader
        title={mode === "review" ? "Review handover" : `${props.shift} shift handover`}
        subtitle={`Bed ${props.patient.bedNumber ?? "—"} · ${props.patient.name} · ${props.shiftDate}`}
        onClose={props.onClose}
      />

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
                ? "Auto-stops after 10 s of silence · 15 min cap"
                : "Tap to walk through SOAP + timeline + ISBARR"
            }
            onPress={r.isRecording ? stop : start}
          />

          <Card compact style={{ marginTop: 24, width: "100%" }}>
            {r.transcript ? (
              <Text style={s.transcriptText} numberOfLines={10}>
                {r.transcript}
              </Text>
            ) : (
              <View>
                <Text style={s.hintHead}>How to dictate</Text>
                <Text style={s.hintBody}>
                  Walk through your shift in this order — the screen builds
                  SOAP + timeline + ISBARR for you.
                </Text>
                <View style={s.hintList}>
                  <HintItem n="1" text="Subjective — what the patient reported." />
                  <HintItem n="2" text="Objective — what you observed / measured." />
                  <HintItem n="3" text="Goal for next shift." />
                  <HintItem n="4" text='Timeline — say each event with a time ("8 AM, vitals taken").' />
                  <HintItem n="5" text="ISBARR handover — Situation, Background, Assessment, Recommendation, Reassessment." />
                </View>
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
        </View>
      )}

      {mode === "review" && extracted && (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
          <Section title="SOAP">
            <Field label="Subjective (S)" body={md(extracted.soapSubjective)} />
            <Field label="Objective (O)" body={md(extracted.soapObjective)} />
            <Field label="Goal for next shift" body={extracted.soapGoal ?? ""} />
          </Section>

          <Section title={`Timeline · ${extracted.timeline?.length ?? 0} events`}>
            {(extracted.timeline ?? []).map((e, i) => (
              <View key={i} style={s.timelineRow}>
                <Text style={s.timelineTime}>{e.time}</Text>
                <View
                  style={[
                    s.timelineDot,
                    {
                      backgroundColor:
                        e.type === "education" ? theme.color.accent : theme.color.primary,
                    },
                  ]}
                />
                <Text style={s.timelineText}>{e.text}</Text>
              </View>
            ))}
            {(!extracted.timeline || extracted.timeline.length === 0) && (
              <Text style={s.fieldEmpty}>No timeline events extracted.</Text>
            )}
          </Section>

          <Section title="ISBARR handover">
            <Field label="Situation (S)" body={extracted.isbarrSituation ?? ""} />
            <Field label="Background (B)" body={extracted.isbarrBackground ?? ""} />
            <Field label="Assessment (A)" body={extracted.isbarrAssessment ?? ""} />
            <Field label="Recommendation (R)" body={extracted.isbarrRecommendation ?? ""} />
            <Field label="Reassessment (R)" body={extracted.isbarrReassessment ?? ""} />
          </Section>

          {r.transcript && (
            <Section title="Transcript">
              <Text style={s.transcript}>{r.transcript}</Text>
            </Section>
          )}
        </ScrollView>
      )}

      {mode === "review" && (
        <View style={s.actionsBar}>
          <View style={{ flex: 1 }}>
            <Button label="Re-record" variant="secondary" onPress={reRecord} fullWidth />
          </View>
          <View style={{ flex: 1.6 }}>
            <Button label="Submit handover" onPress={submit} fullWidth />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function HintItem({ n, text }: { n: string; text: string }) {
  return (
    <View style={s.hintItem}>
      <View style={s.hintBullet}>
        <Text style={s.hintBulletText}>{n}</Text>
      </View>
      <Text style={s.hintItemText}>{text}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field({ label, body }: { label: string; body: string }) {
  return (
    <View style={s.fieldBlock}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={[s.fieldBody, !body.trim() && s.fieldEmpty]}>
        {body.trim() ? body : "Not stated"}
      </Text>
    </View>
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

  // Pre-recording hint — numbered list keeps the 5-step flow readable
  // without an opaque wall of italic text.
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
  hintList: { gap: 10 },
  hintItem: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  hintBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.color.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  hintBulletText: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.color.primaryDeep,
  },
  hintItemText: {
    flex: 1,
    fontSize: 14,
    color: theme.color.text,
    lineHeight: 21,
  },

  scroll: { flex: 1, backgroundColor: theme.color.surface },
  scrollContent: { padding: theme.space.lg, paddingBottom: 96 },
  section: {
    marginBottom: theme.space.xl,
    paddingBottom: theme.space.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.line,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.color.primary,
    marginBottom: 14,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  fieldBlock: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.color.text,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldBody: { fontSize: 15, color: theme.color.text, lineHeight: 22 },
  fieldEmpty: { color: theme.color.textMuted, fontStyle: "italic" },

  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  timelineTime: {
    width: 60,
    fontSize: 13,
    fontWeight: "700",
    color: theme.color.text,
    marginTop: 2,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 7,
    marginRight: 10,
  },
  timelineText: { flex: 1, fontSize: 15, color: theme.color.text, lineHeight: 22 },

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
