/**
 * View a saved visit. Shows the metadata, full transcript, and the
 * structured JSON the SDK extracted. In a real EMR you'd render the
 * fields into typed UI (BP gauge, allergy badges, prescription list);
 * the demo keeps it as raw JSON so the data-shape is obvious.
 */
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { listVisits } from "../lib/storage";
import type { SavedVisit } from "../lib/types";

type Props = NativeStackScreenProps<RootStackParamList, "VisitDetail">;

export function VisitDetailScreen({ route }: Props) {
  const [visit, setVisit] = useState<SavedVisit | null>(null);
  useEffect(() => {
    void listVisits().then((all) => {
      setVisit(all.find((v) => v.id === route.params.visitId) ?? null);
    });
  }, [route.params.visitId]);

  if (!visit) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Loading visit…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>{visit.patientName}</Text>
      <Text style={styles.meta}>
        {visit.patientId} · {new Date(visit.recordedAt).toLocaleString()} ·{" "}
        {visit.durationSec.toFixed(0)}s ·{" "}
        {visit.speakerMode === "doctor" ? "Doctor only" : "Doctor + Patient"}
      </Text>

      <Text style={styles.label}>Transcript</Text>
      <Text style={styles.transcript}>{visit.transcript}</Text>

      <Text style={styles.label}>Structured JSON</Text>
      <Text style={styles.json}>{JSON.stringify(visit.data, null, 2)}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16, paddingBottom: 64 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#64748b" },
  h1: { fontSize: 22, fontWeight: "700" },
  meta: { fontSize: 11, color: "#64748b", marginTop: 4, marginBottom: 16 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: 12,
    marginBottom: 6,
  },
  transcript: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  json: {
    fontFamily: "Courier",
    fontSize: 11,
    backgroundColor: "#0f172a",
    color: "#e2e8f0",
    padding: 12,
    borderRadius: 10,
  },
});
