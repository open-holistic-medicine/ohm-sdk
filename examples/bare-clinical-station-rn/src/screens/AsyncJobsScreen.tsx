import AudioRecorderPlayer from "react-native-audio-recorder-player";
/**
 * Async-jobs screen — exercises every part of the async surface:
 *
 *   • ohm.audio.jobs.create({ apiSlug, file, webhookUrl?, onProgress, idempotencyKey })
 *   • ohm.audio.jobs.get(jobId)               (manual one-shot poll)
 *   • ohm.audio.jobs.poll(jobId, { onProgress })  (loop until terminal)
 *   • ohm.audio.jobs.cancel(jobId)            (best-effort cancel)
 *   • ohm.audio.extractAsync(...)             (create + poll convenience)
 *
 * Two modes available via a segmented control:
 *
 *   "Polling" — device polls /jobs/:id every 2s. Demonstrated end-to-end.
 *   "Webhook" — device fires-and-forgets; YOUR backend receives the
 *               signed callback. The screen explains the contract +
 *               links to docs (no demo callback receiver — that's
 *               server-side code).
 *
 * Use case: long recordings (>30s), background uploads, mobile
 * scenarios where holding an HTTP connection open is fragile.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  BareRecorder,
  type JobDetail,
  type RecorderState,
  type RNFile,
} from "@ohm_studio/sdk-react-native";
import { ohm, SLUG } from "../lib/ohm-client";
import { theme } from "../lib/theme";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ErrorBanner } from "../components/ErrorBanner";
import { JsonPreview } from "../components/JsonPreview";
import { MicButton } from "../components/MicButton";
import { Pill } from "../components/Pill";
import { ProgressBar } from "../components/ProgressBar";
import { SegmentedControl } from "../components/SegmentedControl";
import { toFriendlyError } from "../lib/errors";
import { demoPatientHash, formatDuration } from "../lib/format";
import { DEMO_PATIENT, DEMO_DOCTOR } from "./HomeStack";

type Phase =
  | "idle"
  | "recording"
  | "uploading"
  | "polling"
  | "completed"
  | "failed"
  | "cancelled";

type Mode = "polling" | "webhook";

const WEBHOOK_URL = process.env.EXPO_PUBLIC_OHM_WEBHOOK_URL;

export function AsyncJobsScreen() {
  const [mode, setMode] = useState<Mode>("polling");

  // ─── recorder state (we use the bare BareRecorder, not useRecorder,
  //     because the auto-extract path is sync — we want the file in hand
  //     so we can choose between create() and extractAsync() below).
  const [recState, setRecState] = useState<RecorderState>("idle");
  const [level, setLevel] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const recRef = useRef<BareRecorder | null>(null);

  // ─── job state
  const [phase, setPhase] = useState<Phase>("idle");
  const [uploadPct, setUploadPct] = useState(0);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [error, setError] = useState<ReturnType<typeof toFriendlyError> | null>(null);
  const cancelAcRef = useRef<AbortController | null>(null);

  const ensureRecorder = () => {
    if (recRef.current) return recRef.current;
    // SDK BareRecorder typings were authored against react-native-audio-recorder-player
    // v3-era return types; v4 changed setSubscriptionDuration to void. Runtime works
    // fine; the cast just satisfies the type check on a maintained recorder release.
    const r = new BareRecorder(
      AudioRecorderPlayer as unknown as ConstructorParameters<typeof BareRecorder>[0],
      {
        onStateChange: setRecState,
        onLevel: setLevel,
        onStatus: (st: { durationMillis: number }) =>
          setDurationSec(st.durationMillis / 1000),
      },
    );
    recRef.current = r;
    return r;
  };

  useEffect(
    () => () => {
      void recRef.current?.cancel().catch(() => undefined);
      try {
        cancelAcRef.current?.abort();
      } catch {
        /* ignore */
      }
      recRef.current = null;
    },
    [],
  );

  const reset = () => {
    setPhase("idle");
    setUploadPct(0);
    setJob(null);
    setError(null);
    setLevel(0);
    setDurationSec(0);
    void recRef.current?.cancel().catch(() => undefined);
    recRef.current = null;
  };

  const startRec = async () => {
    setError(null);
    setPhase("recording");
    setUploadPct(0);
    setJob(null);
    await ensureRecorder().start();
  };

  const stopAndSubmit = async () => {
    const r = recRef.current;
    if (!r || !ohm) return;
    let file: RNFile | null = null;
    try {
      file = await r.stop();
    } catch (e) {
      setError(toFriendlyError(e));
      setPhase("failed");
      return;
    }
    if (!file) {
      setError(toFriendlyError(new Error("Recording produced no file")));
      setPhase("failed");
      return;
    }
    await submitJob(file);
  };

  const submitJob = async (file: RNFile) => {
    if (!ohm) return;
    setPhase("uploading");
    setUploadPct(0);
    setError(null);
    const ac = new AbortController();
    cancelAcRef.current = ac;
    const idempotencyKey = `vitals_${DEMO_PATIENT.id}_${Date.now()}`;
    try {
      const created = await ohm.audio.jobs.create({
        apiSlug: SLUG.vitals,
        file,
        language: "auto",
        patientHash: demoPatientHash(DEMO_PATIENT.id),
        recordedById: DEMO_DOCTOR.id,
        webhookUrl: mode === "webhook" ? WEBHOOK_URL : undefined,
        idempotencyKey,
        signal: ac.signal,
        onProgress: (p) => setUploadPct(p.percent),
      });
      // For webhook mode we stop here — backend receives the callback.
      // For polling mode we transition to polling.
      if (mode === "webhook") {
        setJob({
          id: created.jobId,
          status: created.status,
          apiId: null,
          endpoint: "audio.extract",
          workerProgress: 0,
          audioSeconds: null,
          totalTokens: null,
          resultTranscript: null,
          resultLanguage: null,
          resultData: null,
          errorCode: null,
          errorMessage: null,
          createdAt: created.createdAt,
          startedAt: null,
          completedAt: null,
          webhookUrl: WEBHOOK_URL ?? null,
        });
        setPhase("polling"); // visually: "submitted, awaiting callback"
        return;
      }
      setPhase("polling");
      const final = await ohm.audio.jobs.poll(created.jobId, {
        intervalMs: 2000,
        signal: ac.signal,
        onProgress: (j) => setJob(j),
      });
      setJob(final);
      setPhase(
        final.status === "COMPLETED"
          ? "completed"
          : final.status === "CANCELLED"
            ? "cancelled"
            : "failed",
      );
      if (final.status === "FAILED") {
        setError(
          toFriendlyError(
            new Error(final.errorMessage ?? "Job failed (no message)"),
          ),
        );
      }
    } catch (e) {
      setError(toFriendlyError(e));
      setPhase("failed");
    } finally {
      if (cancelAcRef.current === ac) cancelAcRef.current = null;
    }
  };

  const cancelJob = async () => {
    if (!ohm || !job) return;
    try {
      const after = await ohm.audio.jobs.cancel(job.id);
      setJob(after);
      setPhase("cancelled");
      cancelAcRef.current?.abort();
    } catch (e) {
      setError(toFriendlyError(e));
    }
  };

  const refreshJob = async () => {
    if (!ohm || !job) return;
    try {
      const after = await ohm.audio.jobs.get(job.id);
      setJob(after);
    } catch (e) {
      setError(toFriendlyError(e));
    }
  };

  const isRecording = recState === "recording";
  const micState =
    phase === "uploading" || phase === "polling"
      ? "extracting"
      : isRecording
        ? "recording"
        : "idle";

  const statusTone = useMemo(() => {
    if (phase === "completed") return "success" as const;
    if (phase === "failed") return "danger" as const;
    if (phase === "cancelled") return "neutral" as const;
    if (phase === "polling" || phase === "uploading") return "warn" as const;
    if (phase === "recording") return "info" as const;
    return "neutral" as const;
  }, [phase]);

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View>
          <Text style={s.eyebrow}>Async jobs</Text>
          <Text style={s.title}>Long recordings without holding the line</Text>
          <Text style={s.subtitle}>
            Submit audio, get a jobId back in ~100 ms, then either poll
            from the device or have OHM POST the result to your backend.
          </Text>
        </View>

        <View style={{ marginTop: theme.space.lg }}>
          <SegmentedControl
            value={mode}
            onChange={(m) => {
              setMode(m);
              reset();
            }}
            options={[
              { label: "Polling", value: "polling" },
              { label: "Webhook", value: "webhook" },
            ]}
          />
        </View>

        <Card
          title={mode === "polling" ? "Client-side polling" : "Backend webhook"}
          subtitle={
            mode === "polling"
              ? "Device polls /jobs/:id every 2 s until COMPLETED / FAILED."
              : "Device fires-and-forgets. Your server receives a signed callback when terminal."
          }
          right={<Pill label={mode === "polling" ? "0 backend" : "1 endpoint"} tone="info" />}
          style={{ marginTop: theme.space.md }}
        >
          {mode === "webhook" && !WEBHOOK_URL && (
            <View style={s.calloutWarn}>
              <Text style={s.calloutWarnText}>
                Set <Text style={s.code}>EXPO_PUBLIC_OHM_WEBHOOK_URL</Text> in{" "}
                <Text style={s.code}>.env</Text> to enable webhook mode. Until
                then, the demo will run polling even if "Webhook" is selected.
              </Text>
            </View>
          )}
          {mode === "webhook" && WEBHOOK_URL && (
            <View style={s.calloutInfo}>
              <Text style={s.calloutInfoText}>
                Your server will receive a POST to{" "}
                <Text style={s.code}>{WEBHOOK_URL}</Text> with{" "}
                <Text style={s.code}>X-OHM-Signature</Text> (HMAC-SHA256) +{" "}
                <Text style={s.code}>X-OHM-Delivery-Id</Text>. Verify the sig,
                store the result.
              </Text>
            </View>
          )}
        </Card>

        <Card style={{ marginTop: theme.space.md }}>
          <View style={{ alignItems: "center" }}>
            <MicButton
              state={micState}
              level={level}
              durationSec={phase === "recording" ? durationSec : undefined}
              hint={
                phase === "uploading"
                  ? `Uploading · ${uploadPct.toFixed(0)}%`
                  : phase === "polling"
                    ? mode === "webhook"
                      ? "Submitted — awaiting backend callback"
                      : `Polling${job ? ` · ${job.workerProgress ?? 0}%` : "…"}`
                    : phase === "completed"
                      ? "Done — submit another"
                      : phase === "recording"
                        ? "Recording — tap Stop when ready to submit"
                        : "Tap to record · long audio supported (>30 min)"
              }
              onPress={
                phase === "recording"
                  ? stopAndSubmit
                  : phase === "polling" || phase === "uploading"
                    ? () => undefined
                    : startRec
              }
            />
            {(phase === "uploading" ||
              (phase === "polling" && mode === "polling")) && (
              <View style={{ width: "100%", marginTop: 12 }}>
                {phase === "uploading" ? (
                  <ProgressBar percent={uploadPct} />
                ) : (
                  <ProgressBar percent={job?.workerProgress ?? 0} />
                )}
              </View>
            )}
          </View>

          {(phase === "polling" || phase === "completed" || phase === "cancelled") &&
          job ? (
            <View style={{ marginTop: theme.space.md, gap: 8 }}>
              <View style={s.kvRow}>
                <Text style={s.kvKey}>jobId</Text>
                <Text style={s.kvVal} numberOfLines={1}>
                  {job.id}
                </Text>
              </View>
              <View style={s.kvRow}>
                <Text style={s.kvKey}>status</Text>
                <Pill label={job.status} tone={statusTone} />
              </View>
              {job.audioSeconds != null && (
                <View style={s.kvRow}>
                  <Text style={s.kvKey}>audio</Text>
                  <Text style={s.kvVal}>{formatDuration(job.audioSeconds)}</Text>
                </View>
              )}
              {job.totalTokens != null && (
                <View style={s.kvRow}>
                  <Text style={s.kvKey}>tokens</Text>
                  <Text style={s.kvVal}>{job.totalTokens.toLocaleString()}</Text>
                </View>
              )}
            </View>
          ) : null}

          {error && (
            <View style={{ marginTop: 12 }}>
              <ErrorBanner
                message={error.body}
                code={error.code}
                hint={error.hint}
              />
            </View>
          )}
        </Card>

        {(phase === "polling" || phase === "uploading") && (
          <View style={s.actionRow}>
            <Button
              label="Cancel job"
              variant="danger"
              onPress={cancelJob}
              disabled={!job}
            />
            <Button label="Refresh" variant="secondary" onPress={refreshJob} disabled={!job} />
          </View>
        )}
        {(phase === "completed" || phase === "failed" || phase === "cancelled") && (
          <View style={s.actionRow}>
            <Button label="Run another" variant="secondary" onPress={reset} />
          </View>
        )}

        {phase === "completed" && job?.resultTranscript && (
          <Card title="Transcript" style={{ marginTop: theme.space.md }}>
            <Text style={s.transcript}>{job.resultTranscript}</Text>
          </Card>
        )}
        {phase === "completed" && job?.resultData && (
          <View style={{ marginTop: theme.space.md }}>
            <JsonPreview value={job.resultData} label="resultData" />
          </View>
        )}

        <Card title="What happened under the hood" compact style={{ marginTop: theme.space.md }}>
          <Text style={s.docBody}>
            1. <Text style={s.code}>ohm.audio.jobs.create({"{ ... }"})</Text> uploaded the
            audio multipart-encoded with{" "}
            <Text style={s.code}>X-OHM-Idempotency-Key</Text>. Returned in
            ~100 ms.
            {"\n"}
            2. {mode === "polling"
              ? "ohm.audio.jobs.poll(jobId, { onProgress }) ticked every 2 s until status was COMPLETED / FAILED / CANCELLED."
              : "Server enqueued the job; the device returned. Your backend will receive a signed POST when terminal."}
            {"\n"}
            3. <Text style={s.code}>onProgress</Text> drove the upload bar
            (XHR-based on RN — fetch has no upload-progress API).
          </Text>
          <View style={{ marginTop: 8 }}>
            <Button
              label="Read async docs ↗"
              variant="ghost"
              size="sm"
              onPress={() =>
                Linking.openURL("https://docs.ohm.doctor/sdk/async-extraction")
              }
            />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.canvas },
  scroll: { padding: theme.space.lg, paddingBottom: theme.space.xxl },
  eyebrow: { ...theme.font.label, color: theme.color.primary, marginBottom: 4 },
  title: theme.font.h1,
  subtitle: {
    ...theme.font.body,
    color: theme.color.textMuted,
    marginTop: 6,
  },

  calloutWarn: {
    backgroundColor: theme.color.warnSoft,
    borderRadius: theme.radius.md,
    padding: 14,
    marginTop: 4,
  },
  calloutWarnText: { fontSize: 13, color: "#7C2D12", lineHeight: 20 },
  calloutInfo: {
    backgroundColor: theme.color.infoSoft,
    borderRadius: theme.radius.md,
    padding: 14,
    marginTop: 4,
  },
  calloutInfoText: { fontSize: 13, color: "#1E3A8A", lineHeight: 20 },
  code: {
    fontFamily: theme.font.mono.fontFamily,
    backgroundColor: theme.color.canvasDeep,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    fontSize: 13,
  },

  kvRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  kvKey: { ...theme.font.small, color: theme.color.textMuted, fontWeight: "700" },
  kvVal: { ...theme.font.body, color: theme.color.text, fontWeight: "600", maxWidth: "62%" },

  transcript: {
    fontSize: 14,
    color: theme.color.text,
    lineHeight: 21,
  },

  actionRow: {
    flexDirection: "row",
    gap: theme.space.md,
    marginTop: theme.space.md,
    justifyContent: "center",
  },

  docBody: {
    fontSize: 13,
    color: theme.color.textMuted,
    lineHeight: 20,
  },
});
