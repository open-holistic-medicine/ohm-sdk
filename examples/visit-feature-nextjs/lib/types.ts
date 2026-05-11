/** Minimal shape of an OPD-Prescription extracted visit. */
export interface ExtractedVisit {
  vitals?: {
    bp?: { systolic?: number; diastolic?: number };
    hr?: number;
    temp?: number;
    spo2?: number;
  };
  diagnoses?: Array<{ name: string; status?: "active" | "resolved" }>;
  medications?: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
  }>;
  chiefComplaint?: string;
  presentIllness?: string;
  assessment?: string;
  plan?: string;
}

export interface SavedVisit {
  id: string;
  patientName: string;
  patientId: string;
  recordedAt: string;
  durationSec: number;
  speakerMode: "doctor" | "doctor_patient";
  transcript: string;
  data: ExtractedVisit;
}
