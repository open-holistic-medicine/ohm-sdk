/**
 * Past visits list. Loads from AsyncStorage on focus and exposes a
 * "New visit" button + per-row "View" + swipe-to-delete affordance via
 * a long-press menu (kept simple for the demo).
 */
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { deleteVisit, listVisits } from "../lib/storage";
import type { SavedVisit } from "../lib/types";

type Props = NativeStackScreenProps<RootStackParamList, "VisitList">;

export function VisitListScreen({ navigation }: Props) {
  const [visits, setVisits] = useState<SavedVisit[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setVisits(await listVisits());
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      void reload();
    });
    return unsub;
  }, [navigation, reload]);

  const onLongPress = (v: SavedVisit) => {
    Alert.alert(v.patientName, "Delete this visit?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteVisit(v.id);
          void reload();
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <Pressable
        style={styles.newButton}
        onPress={() => navigation.navigate("NewVisit")}
      >
        <Text style={styles.newButtonText}>+ New visit</Text>
      </Pressable>

      {loading ? (
        <Text style={styles.empty}>Loading…</Text>
      ) : visits.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No visits yet</Text>
          <Text style={styles.empty}>
            Tap "New visit" to record a consult and extract structured JSON.
          </Text>
        </View>
      ) : (
        <FlatList
          data={visits}
          keyExtractor={(v) => v.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() =>
                navigation.navigate("VisitDetail", { visitId: item.id })
              }
              onLongPress={() => onLongPress(item)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.patientName}</Text>
                <Text style={styles.meta}>
                  {item.patientId} ·{" "}
                  {new Date(item.recordedAt).toLocaleString()} ·{" "}
                  {item.durationSec.toFixed(0)}s
                </Text>
                {item.data.chiefComplaint ? (
                  <Text numberOfLines={1} style={styles.complaint}>
                    {item.data.chiefComplaint}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },
  newButton: {
    backgroundColor: "#0f766e",
    margin: 16,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  newButtonText: { color: "white", fontWeight: "700", fontSize: 16 },
  emptyWrap: { padding: 24, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "600", marginBottom: 6 },
  empty: { color: "#64748b", textAlign: "center" },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  row: {
    backgroundColor: "white",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sep: { height: 8 },
  name: { fontSize: 15, fontWeight: "600" },
  meta: { fontSize: 11, color: "#64748b", marginTop: 2 },
  complaint: { fontSize: 12, color: "#475569", marginTop: 6 },
});
