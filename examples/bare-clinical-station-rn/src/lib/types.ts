/**
 * Drop-in EMR types — match the typical inpatient-ward EMR shape so the
 * extracted JSON can persist directly to your existing tables. Types
 * mirror the three Studio schemas in `examples/hospital-integration`.
 */

export interface VitalsRecord {
  id: string;
  temperature?: number;
  pulse?: number;
  respiratoryRate?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  spo2?: number;
  painScore?: number;
  recordedAt: string;
  recordedBy: string;
}

export interface DoctorNote {
  id: string;
  authorId: string;
  authorName: string;
  /** Markdown bullet list of observations / assessment. */
  content: string;
  /** Optional Markdown bullet list of next-step plan. */
  plan?: string;
  createdAt: string;
}

export type ShiftSlot = "Morning" | "Evening" | "Night";

export interface NurseShiftHandover {
  id: string;
  nurseId: string;
  nurseName: string;
  shift: ShiftSlot;
  shiftDate: string;
  soap: {
    /** Markdown bullet list. */
    subjective: string;
    /** Markdown bullet list. */
    objective: string;
    goal: string;
  };
  timeline: Array<{
    id: string;
    /** HH:MM (24-hour). */
    time: string;
    type: "progress" | "education";
    text: string;
  }>;
  isbarr: {
    situation: string;
    background: string;
    assessment: string;
    recommendation: string;
    reassessment: string;
  };
  createdAt: string;
}

/** What the user is doing on a given screen — drives the recorder UI. */
export type CaptureMode = "idle" | "recording" | "extracting" | "review";
