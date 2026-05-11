/**
 * Tools → Errors — trigger every typed OHM error class so a developer
 * can verify their try/catch ladder works without waiting for a real
 * network failure. Each row points one of the SDK's `OHM*Error` classes
 * and shows the resulting `<ErrorBanner />` underneath.
 *
 * Triggered errors:
 *   • OHMAuthError         — bogus API key
 *   • OHMValidationError   — bad apiSlug
 *   • OHMNotFoundError     — non-existent slug
 *   • OHMTimeoutError      — timeout: 1ms
 *   • OHMNetworkError      — bogus baseUrl
 *   • OHMAbortError        — AbortController.abort() before send
 *
 * Plus a button to demo `restoreTokens()` PHI helper round-trip.
 */
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OHM, restoreTokens } from "@ohm_studio/sdk-react-native";
import { theme } from "../../lib/theme";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { ErrorBanner } from "../../components/ErrorBanner";
import { JsonPreview } from "../../components/JsonPreview";
import { Pill } from "../../components/Pill";
import { toFriendlyError } from "../../lib/errors";

interface Row {
  key: string;
  title: string;
  errorClass: string;
  hint: string;
  trigger: () => Promise<unknown>;
}

const ROWS: Row[] = [
  {
    key: "auth",
    title: "Trigger OHMAuthError",
    errorClass: "OHMAuthError",
    hint: "Bogus API key → 401",
    trigger: async () => {
      const bad = new OHM({
        apiKey: "ohms_test_definitely_wrong",
        acknowledgeBundledKey: true,
      });
      return bad.extract({ apiSlug: "x", text: "x" });
    },
  },
  {
    key: "validation",
    title: "Trigger OHMValidationError",
    errorClass: "OHMValidationError",
    hint: "Empty `text` → 422",
    trigger: async () => {
      const c = new OHM({
        apiKey: process.env.EXPO_PUBLIC_OHM_API_KEY!,
        acknowledgeBundledKey: true,
      });
      return c.extract({ apiSlug: "x", text: "" });
    },
  },
  {
    key: "notfound",
    title: "Trigger OHMNotFoundError",
    errorClass: "OHMNotFoundError",
    hint: "Slug that doesn't exist → 404",
    trigger: async () => {
      const c = new OHM({
        apiKey: process.env.EXPO_PUBLIC_OHM_API_KEY!,
        acknowledgeBundledKey: true,
      });
      return c.extract({
        apiSlug: "this-api-does-not-exist-xyz",
        text: "hello",
      });
    },
  },
  {
    key: "timeout",
    title: "Trigger OHMTimeoutError",
    errorClass: "OHMTimeoutError",
    hint: "timeoutMs: 1 — fails before the request can complete",
    trigger: async () => {
      const c = new OHM({
        apiKey: process.env.EXPO_PUBLIC_OHM_API_KEY!,
        acknowledgeBundledKey: true,
        timeoutMs: 1,
      });
      return c.extract({ apiSlug: "any", text: "hello" });
    },
  },
  {
    key: "network",
    title: "Trigger OHMNetworkError",
    errorClass: "OHMNetworkError",
    hint: "baseUrl that won't resolve → DNS failure",
    trigger: async () => {
      const c = new OHM({
        apiKey: process.env.EXPO_PUBLIC_OHM_API_KEY!,
        baseUrl: "https://this-host-does-not-exist.invalid",
        acknowledgeBundledKey: true,
      });
      return c.extract({ apiSlug: "any", text: "hello" });
    },
  },
  {
    key: "abort",
    title: "Trigger OHMAbortError",
    errorClass: "OHMAbortError",
    hint: "AbortController.abort() before send",
    trigger: async () => {
      const c = new OHM({
        apiKey: process.env.EXPO_PUBLIC_OHM_API_KEY!,
        acknowledgeBundledKey: true,
      });
      const ac = new AbortController();
      ac.abort();
      return c.extract({ apiSlug: "any", text: "hello", signal: ac.signal });
    },
  },
];

export function ErrorsTool() {
  const [results, setResults] = useState<
    Record<string, ReturnType<typeof toFriendlyError>>
  >({});
  const [busy, setBusy] = useState<string | null>(null);

  const trigger = async (row: Row) => {
    setBusy(row.key);
    try {
      await row.trigger();
      setResults((r) => ({
        ...r,
        [row.key]: {
          code: "no-throw",
          title: "Surprise — call succeeded",
          body: "The trigger didn't error this time. Try a different row.",
        },
      }));
    } catch (e) {
      setResults((r) => ({ ...r, [row.key]: toFriendlyError(e) }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Card
          title="Errors playground"
          subtitle="Every typed OHM error class, triggered on demand. Use this to verify your try/catch ladder."
        >
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            <Pill label="OHMAuthError" tone="danger" />
            <Pill label="OHMValidationError" tone="danger" />
            <Pill label="OHMRateLimitError" tone="warn" />
            <Pill label="OHMNotFoundError" tone="danger" />
            <Pill label="OHMTimeoutError" tone="warn" />
            <Pill label="OHMNetworkError" tone="warn" />
            <Pill label="OHMAbortError" tone="neutral" />
            <Pill label="OHMServerError" tone="danger" />
            <Pill label="OHMQuotaExceededError" tone="warn" />
            <Pill label="OHMConfigError" tone="danger" />
          </View>
        </Card>

        {ROWS.map((row) => (
          <Card key={row.key} style={s.gap}>
            <Text style={s.rowTitle}>{row.title}</Text>
            <Text style={s.rowHint}>{row.hint}</Text>
            <View style={{ marginTop: 8 }}>
              <Button
                label={`Run · ${row.errorClass}`}
                size="sm"
                variant="secondary"
                onPress={() => trigger(row)}
                loading={busy === row.key}
              />
            </View>
            {results[row.key] && (
              <View style={{ marginTop: 10 }}>
                <ErrorBanner
                  message={results[row.key].body}
                  code={results[row.key].code}
                  hint={results[row.key].hint}
                />
              </View>
            )}
          </Card>
        ))}

        <PhiTokenDemo />
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * restoreTokens demo — shows how the PHI redaction round-trip works
 * client-side. The server returned tokens (e.g. [PATIENT_1]); the
 * client maps them back to the original values it knows.
 */
function PhiTokenDemo() {
  const tokenMap = {
    "[PATIENT_1]": "Mr Rajesh Sharma",
    "[MRN_1]": "MRN 88421",
    "[PHONE_1]": "+91 98421 67890",
  };
  const redacted = {
    diagnosis: "Likely [PATIENT_1] CKD stage 3 — see [MRN_1].",
    contact: "Reach the patient at [PHONE_1].",
  };
  const restored = restoreTokens(redacted, tokenMap);

  return (
    <Card title="PHI tokens → restore" style={s.gap}>
      <Text style={s.rowHint}>
        Server returned PHI as opaque tokens. Client calls{" "}
        <Text style={s.code}>restoreTokens(data, tokenMap)</Text> to swap them
        back to real values it already holds — PHI never leaves the device.
      </Text>
      <View style={{ marginTop: 10 }}>
        <JsonPreview value={redacted} label="server response (redacted)" maxHeight={140} />
      </View>
      <View style={{ marginTop: 8 }}>
        <JsonPreview value={restored} label="after restoreTokens()" maxHeight={140} />
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.canvas },
  scroll: { padding: theme.space.lg, paddingBottom: theme.space.xxl, gap: theme.space.md },
  rowTitle: { fontSize: 15, fontWeight: "700", color: theme.color.text },
  rowHint: { fontSize: 13, color: theme.color.textMuted, marginTop: 6, lineHeight: 20 },
  gap: { marginTop: theme.space.md },
  code: {
    fontFamily: theme.font.mono.fontFamily,
    backgroundColor: theme.color.canvasDeep,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    fontSize: 13,
  },
});
