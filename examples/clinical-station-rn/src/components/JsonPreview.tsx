import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { theme } from "../lib/theme";

/**
 * Pretty-printed JSON block with a copy-to-clipboard button. Used in
 * Tools / Catalog / Async tabs to inspect raw responses.
 */
export function JsonPreview({
  value,
  label,
  maxHeight = 280,
}: {
  value: unknown;
  label?: string;
  maxHeight?: number;
}) {
  const json = (() => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  })();
  const copy = async () => {
    try {
      await Clipboard.setStringAsync(json);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      /* ignore */
    }
  };
  return (
    <View style={s.wrap}>
      <View style={s.header}>
        {label ? <Text style={s.label}>{label}</Text> : <View />}
        <Pressable onPress={copy} hitSlop={8} style={s.copyBtn}>
          <Text style={s.copyText}>Copy</Text>
        </Pressable>
      </View>
      <ScrollView style={[s.body, { maxHeight }]}>
        <Text style={s.mono} selectable>
          {json}
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    backgroundColor: theme.color.inkBlack,
    borderRadius: theme.radius.md,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  label: { color: "#94e2d5", fontSize: 12, fontWeight: "800", letterSpacing: 0.6 },
  copyBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#1e293b",
    borderRadius: 6,
  },
  copyText: { color: "#cbd5e1", fontSize: 12, fontWeight: "700" },
  body: { padding: 14 },
  mono: {
    fontFamily: theme.font.mono.fontFamily,
    fontSize: 13,
    color: "#e2e8f0",
    lineHeight: 20,
  },
});
