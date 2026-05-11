import { StyleSheet, View } from "react-native";
import { theme } from "../lib/theme";

/**
 * Linear audio-level bar. Pass `level` 0..1 — the bar fills proportionally,
 * with green→amber→red tinting at the upper end so the user knows when
 * they're clipping.
 */
export function VuMeter({ level }: { level: number }) {
  const pct = Math.max(0, Math.min(1, level * 4));
  const color =
    pct > 0.85
      ? theme.color.danger
      : pct > 0.6
        ? theme.color.warn
        : theme.color.success;
  return (
    <View style={s.track}>
      <View style={[s.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

const s = StyleSheet.create({
  track: {
    height: 6,
    width: "100%",
    backgroundColor: theme.color.line,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 3 },
});
