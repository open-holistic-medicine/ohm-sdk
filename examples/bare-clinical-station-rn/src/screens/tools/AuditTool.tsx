/**
 * Tools → Audit — exercises ohm.invocations.searchByPatient({ patientHash, sinceDays }).
 *
 * Compliance-grade view: "every extraction touching this patient in
 * the last N days." OHM only sees the hash — never the raw identifier.
 */
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ohm } from "../../lib/ohm-client";
import { theme } from "../../lib/theme";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { ErrorBanner } from "../../components/ErrorBanner";
import { Pill } from "../../components/Pill";
import { toFriendlyError } from "../../lib/errors";
import { demoPatientHash, formatRelative } from "../../lib/format";
import { DEMO_PATIENT } from "../HomeStack";

export function AuditTool() {
  const [seed, setSeed] = useState(DEMO_PATIENT.id);
  const [hash, setHash] = useState(demoPatientHash(DEMO_PATIENT.id));
  const [sinceDays, setSinceDays] = useState("30");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<ReturnType<typeof toFriendlyError> | null>(null);

  const recomputeHash = (s: string) => {
    setSeed(s);
    setHash(demoPatientHash(s));
  };

  const run = async () => {
    if (!ohm) return;
    setLoading(true);
    setError(null);
    setRows(null);
    setTotal(null);
    try {
      const res = await ohm.invocations.searchByPatient({
        patientHash: hash,
        sinceDays: Number.parseInt(sinceDays, 10) || 30,
        limit: 50,
      });
      setRows(res.invocations);
      setTotal(res.total);
    } catch (e) {
      setError(toFriendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={s.scroll}>
      <Card
        title="Patient audit search"
        subtitle="Compliance-grade: server returns metadata only, never transcripts or extracted JSON."
      >
        <Text style={s.label}>Patient identifier (raw — stays on device)</Text>
        <TextInput
          value={seed}
          onChangeText={recomputeHash}
          style={s.input}
          autoCapitalize="none"
          placeholder="abha:14-digit-id, or MRN, or IPD#"
          placeholderTextColor={theme.color.textFaint}
        />
        <Text style={[s.label, { marginTop: 12 }]}>
          patientHash (sent to server)
        </Text>
        <TextInput
          value={hash}
          editable={false}
          style={[s.input, s.readOnly]}
          numberOfLines={1}
        />
        <Text style={[s.label, { marginTop: 12 }]}>Since (days)</Text>
        <TextInput
          value={sinceDays}
          onChangeText={setSinceDays}
          style={s.input}
          keyboardType="number-pad"
        />
        <View style={{ marginTop: 12 }}>
          <Button label="Search" onPress={run} loading={loading} fullWidth />
        </View>
      </Card>

      {error && (
        <View style={s.gap}>
          <ErrorBanner message={error.body} code={error.code} hint={error.hint} />
        </View>
      )}

      {rows && rows.length === 0 && (
        <Card style={s.gap}>
          <EmptyState
            icon="audit"
            title="No invocations"
            body={`Nothing in the last ${sinceDays} days. Make a call from another tab, then come back.`}
          />
        </Card>
      )}

      {rows && rows.length > 0 && (
        <Card title={`${total} invocations`} style={s.gap}>
          {rows.map((row, i) => (
            <View
              key={row.id ?? i}
              style={[s.row, i === rows.length - 1 && { borderBottomWidth: 0 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.rowEndpoint}>{row.endpoint}</Text>
                <Text style={s.rowMeta}>
                  {row.recordedById ? `${row.recordedById} · ` : ""}
                  {formatRelative(row.createdAt)}
                </Text>
              </View>
              <Pill
                label={row.status ?? "OK"}
                tone={row.status === "SUCCESS" || !row.status ? "success" : "danger"}
              />
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { padding: theme.space.lg, paddingBottom: theme.space.xxl, gap: theme.space.md },
  label: { ...theme.font.label, color: theme.color.textMuted, marginBottom: 8 },
  input: {
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.line,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: theme.color.text,
    fontFamily: theme.font.mono.fontFamily,
  },
  readOnly: { backgroundColor: theme.color.canvasDeep, color: theme.color.textMuted },
  gap: { marginTop: theme.space.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.lineSoft,
  },
  rowEndpoint: { fontSize: 15, fontWeight: "700", color: theme.color.text },
  rowMeta: { fontSize: 13, color: theme.color.textMuted, marginTop: 4 },
});
