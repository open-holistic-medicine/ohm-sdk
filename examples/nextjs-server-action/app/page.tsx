"use client";

import { useState } from "react";
import { Recorder, RecorderError } from "@ohm_studio/sdk";
import { extractAction } from "./actions";

type Result = Awaited<ReturnType<typeof extractAction>>;

export default function Home() {
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
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const start = async () => {
    setErr(null);
    setResult(null);
    try {
      await rec.start();
    } catch (e) {
      if (e instanceof RecorderError && e.code === "PermissionDenied") {
        setErr("Microphone permission denied — allow it in browser settings.");
      } else {
        setErr(e instanceof Error ? e.message : "Couldn't start recording.");
      }
    }
  };

  const stop = async () => {
    setWorking(true);
    try {
      const blob = await rec.stop();
      const fd = new FormData();
      fd.append("audio", blob, "rec.webm");
      setResult(await extractAction(fd));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Stop failed.");
    } finally {
      setWorking(false);
    }
  };

  const isRecording = state === "recording" || state === "paused";

  return (
    <main style={{ padding: 32, fontFamily: "system-ui", maxWidth: 720 }}>
      <h1>OHM SDK — Next.js server action demo</h1>
      <p style={{ color: "#555" }}>
        Record a consult; the server action calls{" "}
        <code>ohm.audio.extract</code> using the live key on the server. The
        in-browser recorder uses the new <code>Recorder</code> from
        <code>@ohm_studio/sdk</code> with a 15-min cap and 8s silence
        auto-stop.
      </p>
      <button
        onClick={isRecording ? stop : start}
        disabled={working}
        style={{
          padding: "12px 24px",
          fontSize: 16,
          background: working ? "#64748b" : isRecording ? "#dc2626" : "#0f766e",
          color: "white",
          border: "none",
          borderRadius: 8,
          cursor: working ? "not-allowed" : "pointer",
        }}
      >
        {working
          ? "Extracting…"
          : isRecording
            ? "Stop & extract"
            : "Record consult"}
      </button>
      {isRecording && (
        <div
          style={{
            marginTop: 12,
            height: 6,
            background: "#e2e8f0",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min(100, level * 400)}%`,
              background: "#10b981",
              transition: "width 100ms linear",
            }}
          />
        </div>
      )}
      {err && (
        <p style={{ color: "#dc2626", marginTop: 12 }}>{err}</p>
      )}
      {result && (
        <section style={{ marginTop: 24 }}>
          {result.ok ? (
            <>
              <h2>Transcript</h2>
              <p style={{ background: "#f1f5f9", padding: 12, borderRadius: 8 }}>
                {result.transcript}
              </p>
              <h2>Structured JSON</h2>
              <pre
                style={{
                  background: "#0f172a",
                  color: "#e2e8f0",
                  padding: 16,
                  borderRadius: 8,
                  overflow: "auto",
                }}
              >
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </>
          ) : (
            <p style={{ color: "#dc2626" }}>Error: {result.error}</p>
          )}
        </section>
      )}
    </main>
  );
}
