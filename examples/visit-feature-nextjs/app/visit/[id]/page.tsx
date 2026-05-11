"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { SavedVisit } from "@/lib/types";
import { getVisit } from "@/lib/storage";

export default function VisitDetailPage() {
  const params = useParams<{ id: string }>();
  const [visit, setVisit] = useState<SavedVisit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setVisit(getVisit(params.id));
    setLoading(false);
  }, [params.id]);

  if (loading) {
    return (
      <main style={{ padding: 32 }}>
        <p>Loading…</p>
      </main>
    );
  }

  if (!visit) {
    return (
      <main style={{ padding: 32 }}>
        <Link href="/" style={{ color: "#0f766e", textDecoration: "none" }}>
          ← Back
        </Link>
        <h1>Visit not found</h1>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px" }}>
      <Link href="/" style={{ color: "#0f766e", textDecoration: "none" }}>
        ← Back
      </Link>
      <h1 style={{ fontSize: 26, marginTop: 8, marginBottom: 4 }}>
        {visit.patientName}
      </h1>
      <p style={{ color: "#64748b", fontSize: 12, marginTop: 0 }}>
        {visit.patientId} · {new Date(visit.recordedAt).toLocaleString()} ·{" "}
        {visit.durationSec.toFixed(0)}s ·{" "}
        {visit.speakerMode === "doctor" ? "Doctor only" : "Doctor + Patient"}
      </p>

      <h2 style={h2}>Transcript</h2>
      <p
        style={{
          background: "white",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          padding: 12,
          fontSize: 14,
          whiteSpace: "pre-wrap",
        }}
      >
        {visit.transcript}
      </p>

      <h2 style={h2}>Structured JSON</h2>
      <pre
        style={{
          background: "#0f172a",
          color: "#e2e8f0",
          borderRadius: 10,
          padding: 12,
          fontSize: 12,
          overflow: "auto",
        }}
      >
        {JSON.stringify(visit.data, null, 2)}
      </pre>
    </main>
  );
}

const h2: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: 1.5,
  marginTop: 24,
  marginBottom: 8,
};
