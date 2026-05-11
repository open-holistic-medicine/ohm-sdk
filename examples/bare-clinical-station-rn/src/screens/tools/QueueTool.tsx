/**
 * Tools → Queue — exercises OhmQueue (offline replay).
 *
 *   • enqueue a fake "audio.transcribe" entry for the demo
 *   • list pending entries
 *   • flush() to replay
 *   • clear() / remove(id) for cleanup
 *
 * In a real app you'd enqueue inside the catch block when an SDK call
 * fails with `OHMNetworkError`, then call `flush()` from a NetInfo
 * listener when connectivity returns.
 */
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { QueueEntry } from "@ohm_studio/sdk-react-native";
import { theme } from "../../lib/theme";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { ErrorBanner } from "../../components/ErrorBanner";
import { Pill } from "../../components/Pill";
import { getQueue } from "../../lib/queue";
import { toFriendlyError } from "../../lib/errors";
import { formatRelative } from "../../lib/format";

export function QueueTool() {
  const q = getQueue();
  const [rows, setRows] = useState<QueueEntry[]>([]);
  const [working, setWorking] = useState<string | null>(null);
  const [stat, setStat] = useState<string | null>(null);
  const [error, setError] = useState<ReturnType<typeof toFriendlyError> | null>(null);

  const refresh = async () => {
    if (!q) return;
    try {
      setRows(await q.list());
    } catch (e) {
      setError(toFriendlyError(e));
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const enqueueDemo = async () => {
    if (!q) return;
    setWorking("enqueue");
    setError(null);
    try {
      await q.enqueue("audio.transcribe", {
        // Demo entry — pretend a previous mic recording failed mid-upload.
        // The `file` URI is illustrative only; flush() would 404 on it.
        file: { uri: "file:///dev/null", name: "rec.m4a", type: "audio/mp4" },
        language: "auto",
      });
      setStat("Queued one entry.");
      await refresh();
    } catch (e) {
      setError(toFriendlyError(e));
    } finally {
      setWorking(null);
    }
  };

  const flush = async () => {
    if (!q) return;
    setWorking("flush");
    setError(null);
    setStat(null);
    try {
      const res = await q.flush();
      setStat(
        `flush() → ${res.replayed} replayed · ${res.failed} failed · ${res.skipped} skipped`,
      );
      await refresh();
    } catch (e) {
      setError(toFriendlyError(e));
    } finally {
      setWorking(null);
    }
  };

  const clear = async () => {
    if (!q) return;
    setWorking("clear");
    setError(null);
    try {
      await q.clear();
      setStat("Cleared.");
      await refresh();
    } catch (e) {
      setError(toFriendlyError(e));
    } finally {
      setWorking(null);
    }
  };

  const remove = async (id: string) => {
    if (!q) return;
    try {
      await q.remove(id);
      await refresh();
    } catch (e) {
      setError(toFriendlyError(e));
    }
  };

  if (!q) {
    return (
      <View style={s.center}>
        <ErrorBanner
          message="OhmQueue is unavailable — make sure your .env has a valid key."
          code="config_error"
        />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.scroll}>
      <Card
        title="Offline queue"
        subtitle="Persists pending OHM calls in AsyncStorage. Flush when connectivity returns."
        right={<Pill label={`${rows.length} pending`} tone={rows.length ? "warn" : "success"} />}
      >
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Button
            label="Enqueue demo entry"
            size="sm"
            variant="secondary"
            onPress={enqueueDemo}
            loading={working === "enqueue"}
          />
          <Button
            label="flush()"
            size="sm"
            variant="secondary"
            onPress={flush}
            loading={working === "flush"}
            disabled={rows.length === 0}
          />
          <Button
            label="clear()"
            size="sm"
            variant="danger"
            onPress={clear}
            loading={working === "clear"}
            disabled={rows.length === 0}
          />
        </View>
        {stat && (
          <Text style={s.stat}>{stat}</Text>
        )}
      </Card>

      {error && (
        <View style={s.gap}>
          <ErrorBanner message={error.body} code={error.code} hint={error.hint} />
        </View>
      )}

      {rows.length === 0 ? (
        <Card style={s.gap}>
          <EmptyState
            icon="queue"
            title="Queue empty"
            body="In production, enqueue entries from the catch block of OHMNetworkError. The queue replays them via flush()."
          />
        </Card>
      ) : (
        <Card title="Pending entries" style={s.gap}>
          {rows.map((row) => (
            <View key={row.id} style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowMethod}>{row.method}</Text>
                <Text style={s.rowMeta}>
                  enqueued {formatRelative(row.enqueuedAt)} · attempts: {row.attempts}
                </Text>
                {row.lastError ? (
                  <Text style={s.rowErr} numberOfLines={2}>
                    {row.lastError}
                  </Text>
                ) : null}
              </View>
              <Button
                label="Drop"
                size="sm"
                variant="ghost"
                onPress={() => remove(row.id)}
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
  center: { padding: theme.space.lg },
  stat: { fontSize: 13, color: theme.color.textMuted, marginTop: 12, fontStyle: "italic" },
  gap: { marginTop: theme.space.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.lineSoft,
  },
  rowMethod: { fontSize: 15, fontWeight: "700", color: theme.color.text },
  rowMeta: { fontSize: 13, color: theme.color.textMuted, marginTop: 4 },
  rowErr: { fontSize: 13, color: theme.color.danger, marginTop: 6, fontStyle: "italic" },
});
