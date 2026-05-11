"use client";

import { useState } from "react";
import { Recorder, RecorderError } from "@ohm_studio/sdk";

/**
 * Streaming demo — `ohm.audio.extract.stream()` is an AsyncIterable that
 * emits chunks as the server makes progress:
 *
 *   1. { type: "transcript", transcript, language? }   ← STT done
 *   2. { type: "data",       data, apiSlug }           ← extraction done
 *   3. { type: "done",       latencyMs }
 *      or { type: "error",   message, code? }
 *
 * UX win: transcript renders ~half a second after STT finishes; the
 * extraction LLM call adds another second or two but the user sees
 * progress immediately.
 *
 * The SDK call is fully client-side here for demo purposes — in
 * production, proxy through your backend so live keys never bundle.
 */
export default function StreamingPage() {
  const [rec] = useState(
    () =>
      new Recorder({
        silenceAutoStop: { ms: 8000 },
        maxDurationMs: 5 * 60_000,
        onLevel: (rms) => setLevel(rms),
        onStateChange: (s) => setState(s),
      }),
  );
  const [state, setState] = useState<
    "idle" | "starting" | "recording" | "paused" | "stopping"
  >("idle");
  const [level, setLevel] = useState(0);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const isRecording = state === "recording" || state === "paused";

  const start = async () => {
    setErr(null);
    setTranscript(null);
    setData(null);
    setLatency(null);
    try {
      await rec.start();
    } catch (e) {
      if (e instanceof RecorderError) setErr(e.message);
      else setErr(e instanceof Error ? e.message : "couldn't start");
    }
  };

  const stopAndStream = async () => {
    try {
      const blob = await rec.stop();
      // Forward the blob to our streaming proxy route below; the route
      // calls ohm.audio.extract.stream(...) and forwards the SSE chunks.
      const fd = new FormData();
      fd.append("audio", blob, "consult.webm");
      const res = await fetch("/api/extract-stream", { method: "POST", body: fd });
      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }
      // Read SSE-style frames out of the response body.
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const frames = buf.split("\n\n");
        buf = frames.pop() ?? "";
        for (const frame of frames) {
          const m = /^data:\s*(.+)$/m.exec(frame);
          if (!m) continue;
          const payload = JSON.parse(m[1]);
          if (payload.type === "transcript") setTranscript(payload.transcript);
          else if (payload.type === "data") setData(payload.data);
          else if (payload.type === "done") setLatency(payload.latencyMs);
          else if (payload.type === "error") setErr(payload.message);
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "stream failed");
    }
  };

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 32 }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>OHM streaming demo</h1>
      <p style={{ color: "#64748b", marginTop: 0 }}>
        Watch the transcript render before the structured JSON arrives — that's{" "}
        <code>ohm.audio.extract.stream()</code>.
      </p>

      <button
        onClick={isRecording ? stopAndStream : start}
        style={{
          width: "100%",
          height: 100,
          background: isRecording ? "#dc2626" : "#0f766e",
          color: "white",
          fontWeight: 700,
          fontSize: 18,
          border: "none",
          borderRadius: 12,
          cursor: "pointer",
          marginTop: 16,
        }}
      >
        {isRecording ? "STOP & STREAM" : "RECORD"}
      </button>
      {isRecording && (
        <div
          style={{
            height: 6,
            background: "#e2e8f0",
            borderRadius: 3,
            marginTop: 8,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              background: "#10b981",
              transition: "width 100ms linear",
              width: `${Math.min(100, level * 400)}%`,
            }}
          />
        </div>
      )}
      {err && <p style={{ color: "#dc2626", marginTop: 12 }}>{err}</p>}

      {transcript && (
        <section style={{ marginTop: 24 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: 1.5,
              marginBottom: 6,
            }}
          >
            1 — Transcript {data ? "✓" : "(streaming…)"}
          </p>
          <p
            style={{
              background: "white",
              border: "1px solid #e2e8f0",
              padding: 12,
              borderRadius: 10,
              fontSize: 14,
              whiteSpace: "pre-wrap",
            }}
          >
            {transcript}
          </p>
        </section>
      )}

      {data && (
        <section style={{ marginTop: 24 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: 1.5,
              marginBottom: 6,
            }}
          >
            2 — Structured JSON ✓
            {latency ? <span style={{ color: "#64748b" }}> · {latency}ms total</span> : null}
          </p>
          <pre
            style={{
              background: "#0f172a",
              color: "#e2e8f0",
              padding: 12,
              borderRadius: 10,
              fontSize: 12,
              overflow: "auto",
            }}
          >
            {JSON.stringify(data, null, 2)}
          </pre>
        </section>
      )}
    </main>
  );
}
