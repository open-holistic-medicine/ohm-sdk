"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  listRecordings,
  removeRecording,
  type PersistedRecording,
} from "@ohm_studio/sdk";
import type { SavedVisit } from "@/lib/types";
import { deleteVisit, listVisits } from "@/lib/storage";

export default function VisitListPage() {
  const [visits, setVisits] = useState<SavedVisit[]>([]);
  const [pending, setPending] = useState<PersistedRecording[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setVisits(listVisits());
    void listRecordings().then(setPending);
    setLoading(false);
  }, []);

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "32px 24px",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 28, margin: 0 }}>OHM Visits</h1>
        <Link
          href="/new"
          style={{
            background: "#0f766e",
            color: "white",
            padding: "10px 18px",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          + New visit
        </Link>
      </header>

      {pending.length > 0 && (
        <section
          style={{
            background: "#fef3c7",
            border: "1px solid #fde68a",
            borderRadius: 10,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>
            ⚠ {pending.length} unsent recording
            {pending.length === 1 ? "" : "s"} from a previous session
          </p>
          <p style={{ margin: "6px 0 10px", fontSize: 13, color: "#78350f" }}>
            The audio survived a tab crash / network drop (IndexedDB).
            Dismiss to delete, or re-record to redo.
          </p>
          {pending.map((p) => {
            const meta = (p.metadata ?? {}) as Record<string, unknown>;
            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 6,
                  fontSize: 13,
                }}
              >
                <span style={{ flex: 1 }}>
                  {(meta.patientName as string) ?? "Unknown patient"} ·{" "}
                  {new Date(p.savedAt).toLocaleString()}
                </span>
                <button
                  onClick={async () => {
                    await removeRecording(p.id);
                    setPending((rs) => rs.filter((r) => r.id !== p.id));
                  }}
                  style={{
                    background: "transparent",
                    border: "1px solid #fde68a",
                    color: "#78350f",
                    borderRadius: 6,
                    padding: "4px 10px",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  Dismiss
                </button>
              </div>
            );
          })}
        </section>
      )}

      {loading ? (
        <p style={{ color: "#64748b" }}>Loading…</p>
      ) : visits.length === 0 ? (
        <div
          style={{
            background: "white",
            padding: 48,
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            textAlign: "center",
          }}
        >
          <h2 style={{ marginTop: 0 }}>No visits yet</h2>
          <p style={{ color: "#64748b" }}>
            Click &quot;+ New visit&quot; to record a consult and extract
            structured JSON.
          </p>
        </div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {visits.map((v) => (
            <li
              key={v.id}
              style={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: 14,
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <Link
                href={`/visit/${v.id}`}
                style={{
                  flex: 1,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ fontWeight: 600 }}>{v.patientName}</div>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  {v.patientId} ·{" "}
                  {new Date(v.recordedAt).toLocaleString()} ·{" "}
                  {v.durationSec.toFixed(0)}s
                </div>
                {v.data.chiefComplaint && (
                  <div
                    style={{
                      color: "#475569",
                      fontSize: 13,
                      marginTop: 6,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {v.data.chiefComplaint}
                  </div>
                )}
              </Link>
              <button
                onClick={() => {
                  if (confirm("Delete this visit?")) {
                    deleteVisit(v.id);
                    setVisits(listVisits());
                  }
                }}
                style={{
                  background: "transparent",
                  border: "1px solid #e2e8f0",
                  color: "#64748b",
                  borderRadius: 6,
                  padding: "4px 10px",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
