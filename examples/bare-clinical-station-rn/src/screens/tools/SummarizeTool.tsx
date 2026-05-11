/**
 * Tools → Summarize — exercises ohm.summarize({ text, style }).
 * Four canonical styles: patient | handover | executive | progress-note.
 */
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
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
import { ErrorBanner } from "../../components/ErrorBanner";
import { Pill } from "../../components/Pill";
import { SegmentedControl } from "../../components/SegmentedControl";
import { toFriendlyError } from "../../lib/errors";

type Style = "patient" | "handover" | "executive" | "progress-note";

const SAMPLE = `Patient seen for follow-up of CKD stage 3, hypertension, and type-2 diabetes. Today reports mild ankle swelling for 4 days, no breathlessness. BP 148/92 in clinic, FBS 162 mg/dL last week. Creatinine 1.6, eGFR 42. ACE-inhibitor dose increased last visit; tolerating well. Plan: increase furosemide to 40 mg morning, repeat renal panel in 2 weeks, salt restriction <5 g/day. Family education on home BP monitoring given.`;

export function SummarizeTool() {
  const [text, setText] = useState(SAMPLE);
  const [style, setStyle] = useState<Style>("patient");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<ReturnType<typeof toFriendlyError> | null>(null);

  const run = async () => {
    if (!ohm) return;
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const res = await ohm.summarize({ text, style, language: "en" });
      setSummary(res.summary);
    } catch (e) {
      setError(toFriendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={s.scroll}>
        <Card
          title="Free text → summary"
          subtitle="Four styles. Same text, different reader."
          right={<Pill label="POST /summarize" tone="info" />}
        >
          <SegmentedControl
            value={style}
            onChange={setStyle}
            options={[
              { label: "Patient", value: "patient" },
              { label: "Handover", value: "handover" },
              { label: "Exec", value: "executive" },
              { label: "Note", value: "progress-note" },
            ]}
          />
          <Text style={[s.label, { marginTop: 14 }]}>Source text</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            style={[s.input, s.multiline]}
            multiline
            textAlignVertical="top"
            placeholder="Paste any clinical text…"
            placeholderTextColor={theme.color.textFaint}
          />
          <View style={{ marginTop: 12 }}>
            <Button label="Summarise" onPress={run} loading={loading} fullWidth />
          </View>
        </Card>

        {error && (
          <View style={s.gap}>
            <ErrorBanner message={error.body} code={error.code} hint={error.hint} />
          </View>
        )}

        {summary && (
          <Card title={`Summary · ${style}`} style={s.gap}>
            <Text style={s.summary}>{summary}</Text>
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
    lineHeight: 22,
  },
  multiline: { minHeight: 180 },
  gap: { marginTop: theme.space.md },
  summary: { fontSize: 15, color: theme.color.text, lineHeight: 23 },
});
