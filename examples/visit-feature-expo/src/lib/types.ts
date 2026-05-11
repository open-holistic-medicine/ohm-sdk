/**
 * The shape of an OPD Prescription template result. Mirrors the
 * `published_schema` of the cloned starter; the fields here are what the
 * SDK returns from `ohm.audio.extract({ apiSlug: "opd-clinic", file })`.
 *
 * In a real EMR you'd type-generate this from your Studio API spec
 * (or import via `openapi-typescript` against the published OpenAPI
 * doc) — the shape below is enough for the demo.
 */
export interface ExtractedVisit {
  vitals?: {
    bp?: { systolic?: number; diastolic?: number };
    hr?: number;
    temp?: number;
    spo2?: number;
    rr?: number;
    weight?: number;
  };
  diagnoses?: Array<{ name: string; status?: "active" | "resolved" }>;
  medications?: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
  }>;
  allergies?: string[];
  investigations?: string[];
  chiefComplaint?: string;
  presentIllness?: string;
  examination?: string;
  assessment?: string;
  plan?: string;
}

/** A single saved visit — what the local EMR persists. */
export interface SavedVisit {
  id: string;
  patientName: string;
  patientId: string;
  /** ISO date. */
  recordedAt: string;
  durationSec: number;
  language?: string;
  speakerMode: "doctor" | "doctor_patient";
  transcript: string;
  data: ExtractedVisit;
}
