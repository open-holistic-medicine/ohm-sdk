import { StyleSheet, Text, View } from "react-native";
import { theme } from "../lib/theme";

export type PillTone = "primary" | "success" | "warn" | "danger" | "info" | "neutral";

export function Pill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: PillTone;
}) {
  const palette = paletteFor(tone);
  return (
    <View style={[s.pill, { backgroundColor: palette.bg }]}>
      <Text style={[s.label, { color: palette.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function paletteFor(t: PillTone) {
  switch (t) {
    case "primary":
      return { bg: theme.color.primarySoft, fg: theme.color.primaryDeep };
    case "success":
      return { bg: theme.color.successSoft, fg: "#15803D" };
    case "warn":
      return { bg: theme.color.warnSoft, fg: "#A16207" };
    case "danger":
      return { bg: theme.color.dangerSoft, fg: "#B91C1C" };
    case "info":
      return { bg: theme.color.infoSoft, fg: "#1E40AF" };
    default:
      return { bg: theme.color.canvasDeep, fg: theme.color.text };
  }
}

const s = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    alignSelf: "flex-start",
  },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
});
