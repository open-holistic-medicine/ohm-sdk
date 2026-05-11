"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Recorder,
  RecorderError,
  SPEAKER_MODES,
  SUPPORTED_LANGUAGES,
  saveRecording,
  removeRecording,
} from "@ohm_studio/sdk";
import type { SpeakerMode } from "@ohm_studio/sdk";
import { extractVisitAction } from "../actions";
import { saveVisit } from "@/lib/storage";
import type { ExtractedVisit } from "@/lib/types";

export default function NewVisitPage() {
  const router = useRouter();
  const [patientName, setPatientName] = useState("");
  const [patientId, setPatientId] = useState("");
  const [speakerMode, setSpeakerMode] = useState<SpeakerMode>("doctor_patient");
  const [language, setLanguage] = useState<string>("auto");
  const [rec] = useState(
    () =>
      new Recorder({
        silenceAutoStop: { ms: 8000 },
        maxDurationMs: 15 * 60_000,
        wakeLock: true,
        onLevel: (rms) => setLevel(rms),
        onStateChange: (s) => setState(s),
      }),
  );
  const [state, setState] = useState<
    "idle" | "starting" | "recording" | "paused" | "stopping"
  >("idle");
  const [level, setLevel] = useState(0);
  const [extracting, setExtracting] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [data, setData] = useState<ExtractedVisit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const isRecording = state === "recording" || state === "paused";
  const canRecord = patientName.trim() !== "" && patientId.trim() !== "";

  const start = async () => {
    setError(null);
    setTranscript(null);
    setData(null);
    setSavedId(null);
    try {
      await rec.start();
    } catch (e) {
      if (e instanceof RecorderError && e.code === "PermissionDenied") {
        setError("Microphone permission denied — allow it in browser settings.");
      } else {
        setError(e instanceof Error ? e.message : "Couldn't start recording.");
      }
    }
  };

  const stopAndExtract = async () => {
    setExtracting(true);
    setError(null);
    try {
      const blob = await rec.stop();

      // Persist the raw blob to IndexedDB BEFORE extracting. If the tab
      // crashes or the extract fails, the audio survives and shows up
      // on the visit list as "unsent recording" via usePendingRecordings.
      const persistId = await saveRecording(blob, {
        metadata: {
          patientName: patientName.trim(),
          patientId: patientId.trim(),
          speakerMode,
        },
      }).catch(() => null);

      const fd = new FormData();
      fd.append("audio", blob, "consult.webm");
      fd.append("patientId", patientId.trim());
      fd.append("speakerMode", speakerMode);
      if (language && language !== "auto") fd.append("language", language);
      fd.append("durationSec", String(rec.getDuration() / 1000));
      const result = await extractVisitAction(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTranscript(result.transcript);
      setData(result.data);

      // Save into the local "EMR" store (localStorage in this demo).
      const id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      saveVisit({
        id,
        patientName: patientName.trim(),
        patientId: patientId.trim(),
        recordedAt: new Date().toISOString(),
        durationSec: result.durationSec,
        speakerMode,
        transcript: result.transcript,
        data: result.data,
      });
      setSavedId(id);

      // Server confirmed save — drop the IDB recovery copy.
      if (persistId) {
        await removeRecording(persistId).catch(() => undefined);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Stop failed.");
    } finally {
      setExtracting(false);
    }
  };

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px" }}>
      <Link href="/" style={{ color: "#0f766e", textDecoration: "none" }}>
        ← Back
      </Link>
      <h1 style={{ fontSize: 24, marginTop: 8 }}>New visit</h1>

      <section style={section}>
        <p style={sectionLabel}>Patient</p>
        <input
          style={input}
          placeholder="Patient name"
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
          disabled={isRecording || extracting}
        />
        <input
          style={input}
          placeholder="MRN / patient ID"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          disabled={isRecording || extracting}
        />
      </section>

      <section style={section}>
        <p style={sectionLabel}>Language</p>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={isRecording || extracting}
          style={{ ...input, cursor: "pointer", background: "white" }}
        >
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
              {l.nativeLabel && !l.isAutoDetect ? ` · ${l.nativeLabel}` : ""}
            </option>
          ))}
        </select>
      </section>

      <section style={section}>
        <p style={sectionLabel}>Speakers</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {SPEAKER_MODES.map((m) => (
            <button
              key={m.code}
              type="button"
              onClick={() => setSpeakerMode(m.code)}
              disabled={isRecording || extracting}
              style={{
                background: speakerMode === m.code ? "#ecfdf5" : "white",
                border:
                  speakerMode === m.code
                    ? "2px solid #0f766e"
                    : "1px solid #e2e8f0",
                borderRadius: 10,
                padding: 12,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  color: speakerMode === m.code ? "#0f766e" : "#1e293b",
                }}
              >
                {m.label}
              </div>
              <div
                style={{
                  color: "#64748b",
                  fontSize: 11,
                  marginTop: 2,
                  lineHeight: 1.4,
                }}
              >
                {m.description}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section style={section}>
        <p style={sectionLabel}>Recording</p>
        <button
          onClick={isRecording ? stopAndExtract : start}
          disabled={(!canRecord && !isRecording) || extracting}
          style={{
            width: "100%",
            height: 100,
            background: extracting
              ? "#64748b"
              : !canRecord && !isRecording
                ? "#cbd5e1"
                : isRecording
                  ? "#dc2626"
                  : "#0f766e",
            color: "white",
            fontSize: 18,
            fontWeight: 700,
            border: "none",
            borderRadius: 12,
            cursor: extracting || (!canRecord && !isRecording) ? "not-allowed" : "pointer",
          }}
        >
          {extracting ? "Extracting…" : isRecording ? "STOP & EXTRACT" : "RECORD"}
        </button>
        {isRecording && (
          <div style={vuTrack}>
            <div style={{ ...vuFill, width: `${Math.min(100, level * 400)}%` }} />
          </div>
        )}
        {!canRecord && !isRecording && (
          <p style={hint}>Enter patient name + MRN to enable.</p>
        )}
        {error && <p style={errorText}>{error}</p>}
      </section>

      {transcript && (
        <section style={section}>
          <p style={sectionLabel}>Transcript</p>
          <p style={transcriptBox}>{transcript}</p>
        </section>
      )}
      {data && (
        <section style={section}>
          <p style={sectionLabel}>Structured JSON</p>
          <pre style={jsonBox}>{JSON.stringify(data, null, 2)}</pre>
          {savedId ? (
            <button
              onClick={() => router.push(`/visit/${savedId}`)}
              style={{ ...buttonPrimary, background: "#16a34a", marginTop: 14 }}
            >
              Open saved visit ✓
            </button>
          ) : null}
        </section>
      )}
    </main>
  );
}

const section: React.CSSProperties = { marginTop: 24 };
const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: 1.5,
  marginBottom: 8,
};
const input: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  fontSize: 15,
  marginBottom: 8,
  background: "white",
  boxSizing: "border-box",
};
const vuTrack: React.CSSProperties = {
  height: 6,
  background: "#e2e8f0",
  borderRadius: 3,
  marginTop: 8,
  overflow: "hidden",
};
const vuFill: React.CSSProperties = {
  height: "100%",
  background: "#10b981",
  transition: "width 100ms linear",
};
const hint: React.CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  textAlign: "center",
  marginTop: 8,
};
const errorText: React.CSSProperties = {
  color: "#dc2626",
  marginTop: 12,
  textAlign: "center",
};
const transcriptBox: React.CSSProperties = {
  background: "white",
  padding: 12,
  borderRadius: 10,
  fontSize: 14,
  border: "1px solid #e2e8f0",
};
const jsonBox: React.CSSProperties = {
  background: "#0f172a",
  color: "#e2e8f0",
  padding: 12,
  borderRadius: 10,
  fontSize: 12,
  overflow: "auto",
};
const buttonPrimary: React.CSSProperties = {
  background: "#0f766e",
  color: "white",
  padding: "12px 18px",
  border: "none",
  borderRadius: 10,
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 14,
};
