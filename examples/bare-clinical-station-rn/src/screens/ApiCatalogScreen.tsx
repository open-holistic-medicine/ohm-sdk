/**
 * Catalog tab — exercises the apis surface:
 *
 *   • ohm.apis.list({ status })
 *   • ohm.apis.get(slug)
 *
 * Tap a row → fetch full detail → see schema, system prompt, inputs.
 * Bottom of detail: copy-pasteable cURL + RN snippet for that API.
 *
 * This is the "what APIs can I call from this key?" debugging surface
 * developers reach for when wiring a new feature.
 */
import { useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Clipboard } from "../lib/native-bridges";
import { Haptics } from "../lib/native-bridges";
import type { ApiDetail, ApiSummary } from "@ohm_studio/sdk-react-native";
import { ohm } from "../lib/ohm-client";
import { theme } from "../lib/theme";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { ErrorBanner } from "../components/ErrorBanner";
import { JsonPreview } from "../components/JsonPreview";
import { Pill } from "../components/Pill";
import { Button } from "../components/Button";
import { toFriendlyError } from "../lib/errors";
import { formatRelative } from "../lib/format";

export function ApiCatalogScreen() {
  const [list, setList] = useState<ApiSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ReturnType<typeof toFriendlyError> | null>(
    null,
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApiDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchList = async () => {
    if (!ohm) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await ohm.apis.list();
      setList(rows);
    } catch (e) {
      setError(toFriendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchList();
  }, []);

  const openDetail = async (slug: string) => {
    if (!ohm) return;
    setSelected(slug);
    setDetail(null);
    setDetailLoading(true);
    setError(null);
    try {
      const d = await ohm.apis.get(slug);
      setDetail(d);
    } catch (e) {
      setError(toFriendlyError(e));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelected(null);
    setDetail(null);
  };

  if (selected) {
    return (
      <DetailView
        slug={selected}
        loading={detailLoading}
        detail={detail}
        error={error}
        onBack={closeDetail}
      />
    );
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchList} />
        }
      >
        <View>
          <Text style={s.eyebrow}>API catalog</Text>
          <Text style={s.title}>Published APIs on this key</Text>
          <Text style={s.subtitle}>
            Pulled from <Text style={s.code}>ohm.apis.list()</Text>. Tap a row
            to see the full detail (schema, prompt, inputs) returned by{" "}
            <Text style={s.code}>ohm.apis.get(slug)</Text>.
          </Text>
        </View>

        {error && (
          <View style={{ marginTop: theme.space.md }}>
            <ErrorBanner message={error.body} code={error.code} hint={error.hint} />
          </View>
        )}

        {!error && list && list.length === 0 && (
          <Card style={{ marginTop: theme.space.md }}>
            <EmptyState
              icon="catalog"
              title="No published APIs"
              body="Open Studio, clone a starter template, click Publish — then pull-to-refresh here."
            />
          </Card>
        )}

        {list?.map((row) => (
          <Pressable
            key={row.slug}
            onPress={() => openDetail(row.slug)}
            style={({ pressed }) => [
              s.row,
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.rowName}>{row.name ?? row.slug}</Text>
              <Text style={s.rowSlug} selectable>
                {row.slug}
              </Text>
              <View style={s.rowMeta}>
                <Pill
                  label={`v${row.version ?? 1}`}
                  tone="primary"
                />
                <Pill
                  label={row.status ?? "PUBLISHED"}
                  tone={row.status === "DRAFT" ? "warn" : "success"}
                />
                {row.updatedAt && (
                  <Text style={s.rowAge}>{formatRelative(row.updatedAt)}</Text>
                )}
              </View>
            </View>
            <Icon name="forward" size={22} color={theme.color.textFaint} />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailView({
  slug,
  loading,
  detail,
  error,
  onBack,
}: {
  slug: string;
  loading: boolean;
  detail: ApiDetail | null;
  error: ReturnType<typeof toFriendlyError> | null;
  onBack: () => void;
}) {
  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.detailHeader}>
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={s.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back to catalog"
        >
          <Icon name="back" size={20} color={theme.color.primary} />
          <Text style={s.backText}>Catalog</Text>
        </Pressable>
        <Text style={s.detailTitle} numberOfLines={1}>
          {detail?.name ?? slug}
        </Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {loading && (
          <Card>
            <Text style={s.loading}>Loading API detail…</Text>
          </Card>
        )}
        {error && (
          <ErrorBanner message={error.body} code={error.code} hint={error.hint} />
        )}
        {detail && (
          <>
            <Card>
              <View style={s.kvRow}>
                <Text style={s.kvKey}>slug</Text>
                <Text style={s.kvVal} selectable>
                  {detail.slug}
                </Text>
              </View>
              <View style={s.kvRow}>
                <Text style={s.kvKey}>version</Text>
                <Text style={s.kvVal}>v{detail.version ?? 1}</Text>
              </View>
              <View style={s.kvRow}>
                <Text style={s.kvKey}>status</Text>
                <Pill
                  label={detail.status ?? "PUBLISHED"}
                  tone={detail.status === "DRAFT" ? "warn" : "success"}
                />
              </View>
              {detail.publishedAt && (
                <View style={s.kvRow}>
                  <Text style={s.kvKey}>published</Text>
                  <Text style={s.kvVal}>{formatRelative(detail.publishedAt)}</Text>
                </View>
              )}
            </Card>

            <Card title="Inputs" subtitle="Required at call time" style={s.gap}>
              {Array.isArray((detail as any).publishedInputs) &&
              (detail as any).publishedInputs.length > 0 ? (
                ((detail as any).publishedInputs as any[]).map((inp, i) => (
                  <View key={i} style={s.inputRow}>
                    <Text style={s.inputName}>{inp.name}</Text>
                    <Pill label={inp.type ?? "any"} tone="info" />
                    {inp.required ? <Pill label="required" tone="warn" /> : null}
                  </View>
                ))
              ) : (
                <Text style={s.emptyMini}>None</Text>
              )}
            </Card>

            <Card title="Snippet — call from React Native" style={s.gap}>
              <View style={{ marginTop: 4 }}>
                <CodeSnippet
                  text={`await ohm.audio.extract({\n  apiSlug: "${detail.slug}",\n  file: { uri, name: "rec.m4a", type: "audio/mp4" },\n  language: "auto",\n});`}
                />
              </View>
              <View style={{ marginTop: 8 }}>
                <Text style={s.docBody}>
                  Or, for long recordings:{" "}
                  <Text style={s.code}>ohm.audio.extractAsync(...)</Text> →
                  poll until COMPLETED.
                </Text>
              </View>
            </Card>

            <View style={s.gap}>
              <JsonPreview value={detail} label="apis.get(slug) response" />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CodeSnippet({ text }: { text: string }) {
  return (
    <View style={s.codeBlock}>
      <Text style={s.codeText} selectable>
        {text}
      </Text>
      <View style={s.codeBtn}>
        <Button
          label="Copy"
          size="sm"
          variant="secondary"
          onPress={async () => {
            await Clipboard.setStringAsync(text);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.canvas },
  scroll: { padding: theme.space.lg, paddingBottom: theme.space.xxl, gap: theme.space.md },
  eyebrow: { ...theme.font.label, color: theme.color.primary, marginBottom: 4 },
  title: theme.font.h1,
  subtitle: {
    ...theme.font.body,
    color: theme.color.textMuted,
    marginTop: 6,
  },
  code: {
    fontFamily: theme.font.mono.fontFamily,
    backgroundColor: theme.color.canvasDeep,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    fontSize: 13,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.color.line,
    padding: theme.space.md,
    ...theme.shadow.card,
  },
  rowName: { fontSize: 16, fontWeight: "700", color: theme.color.text },
  rowSlug: {
    fontFamily: theme.font.mono.fontFamily,
    fontSize: 13,
    color: theme.color.textMuted,
    marginTop: 3,
  },
  rowMeta: { flexDirection: "row", gap: 8, marginTop: 10, alignItems: "center" },
  rowAge: { fontSize: 12, color: theme.color.textFaint },
  chev: { fontSize: 24, color: theme.color.textFaint, marginLeft: 8 },

  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.space.md,
    paddingVertical: 12,
    backgroundColor: theme.color.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.line,
    justifyContent: "space-between",
  },
  detailTitle: { ...theme.font.h2, flex: 1, textAlign: "center" },
  backBtn: { width: 92, flexDirection: "row", alignItems: "center", gap: 4 },
  backText: { color: theme.color.primary, fontSize: 15, fontWeight: "700" },

  loading: { color: theme.color.textMuted, textAlign: "center", paddingVertical: 14, fontSize: 14 },
  gap: { marginTop: theme.space.md },

  kvRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  kvKey: { ...theme.font.small, color: theme.color.textMuted, fontWeight: "700" },
  kvVal: { fontSize: 14, color: theme.color.text, fontWeight: "600" },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  inputName: { fontSize: 15, fontWeight: "700", color: theme.color.text, flex: 1 },
  emptyMini: { fontSize: 14, color: theme.color.textMuted, fontStyle: "italic" },

  codeBlock: {
    backgroundColor: theme.color.inkBlack,
    borderRadius: theme.radius.md,
    padding: 14,
  },
  codeText: {
    color: "#e2e8f0",
    fontFamily: theme.font.mono.fontFamily,
    fontSize: 13,
    lineHeight: 20,
  },
  codeBtn: { marginTop: 10, alignItems: "flex-start" },
  docBody: { fontSize: 13, color: theme.color.textMuted, lineHeight: 20 },
});
