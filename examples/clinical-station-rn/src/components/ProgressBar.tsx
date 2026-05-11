import { StyleSheet, View } from "react-native";
import { theme } from "../lib/theme";

/** Linear progress bar (0..100). Used during async-job polling and uploads. */
export function ProgressBar({ percent }: { percent: number }) {
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <View style={s.track}>
      <View style={[s.fill, { width: `${pct}%` }]} />
    </View>
  );
}

const s = StyleSheet.create({
  track: {
    height: 8,
    backgroundColor: theme.color.line,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: theme.color.primary },
});
