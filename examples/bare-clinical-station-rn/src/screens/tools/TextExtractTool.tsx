/**
 * Tools → Text extract — exercises ohm.extract({ apiSlug, text }).
 * Use this when you already have a transcript (typed notes, prior STT,
 * OCR'd lab report) and just want it structured.
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
import { ohm, SLUG } from "../../lib/ohm-client";
import { theme } from "../../lib/theme";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { ErrorBanner } from "../../components/ErrorBanner";
import { JsonPreview } from "../../components/JsonPreview";
import { Pill } from "../../components/Pill";
import { toFriendlyError } from "../../lib/errors";

const SAMPLE = `Day 2 post-op cholecystectomy. Patient says pain reduced from 7 to 3 on the 0-10 scale. No fresh chest pain or breathlessness. Wound looks clean, dry, and intact. Vitals — temperature 98.4, pulse 84, RR 18, BP 124/78, SpO2 98 on room air. Plan: continue Augmentin 625 BD for 2 more days, repeat CBC tomorrow morning, follow up in 3 days, ambulate as tolerated.`;

export function TextExtractTool() {
  const [apiSlug, setApiSlug] = useState(SLUG.doctorNote);
  const [text, setText] = useState(SAMPLE);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<ReturnType<typeof toFriendlyError> | null>(null);

  const run = async () => {
    if (!ohm) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await ohm.extract({ apiSlug, text });
      setResult(res);
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
          title="Text → structured JSON"
          subtitle="Already have a transcript? Skip recording — call ohm.extract() directly."
          right={<Pill label="POST /extract/:slug" tone="info" />}
        >
          <Text style={s.label}>API slug</Text>
          <TextInput
            value={apiSlug}
            onChangeText={setApiSlug}
            style={s.input}
            placeholder="opd-clinic"
            placeholderTextColor={theme.color.textFaint}
            autoCapitalize="none"
          />
          <Text style={[s.label, { marginTop: 12 }]}>Transcript</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            style={[s.input, s.multiline]}
            multiline
            textAlignVertical="top"
            placeholder="Paste a transcript…"
            placeholderTextColor={theme.color.textFaint}
          />
          <View style={{ marginTop: 12 }}>
            <Button label="Run extract" onPress={run} loading={loading} fullWidth />
          </View>
        </Card>

        {error && (
          <View style={s.gap}>
            <ErrorBanner message={error.body} code={error.code} hint={error.hint} />
          </View>
        )}

        {result ? (
          <View style={s.gap}>
            <JsonPreview value={result} label="extract result" maxHeight={360} />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll: { padding: theme.space.lg, paddingBottom: theme.space.xxl, gap: theme.space.md },
  label: {
    ...theme.font.label,
    color: theme.color.textMuted,
    marginBottom: 8,
  },
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
});
