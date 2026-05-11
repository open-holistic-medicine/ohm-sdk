import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../lib/theme";

export interface SegmentedControlProps<T extends string> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}

/** Pill-style segmented control. Used in Tools → sub-mode switcher. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View style={s.wrap}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[s.seg, active && s.segActive]}
          >
            <Text style={[s.label, active && s.labelActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: theme.color.canvasDeep,
    borderRadius: theme.radius.pill,
    padding: 4,
  },
  seg: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    alignItems: "center",
  },
  segActive: {
    backgroundColor: theme.color.surface,
    ...theme.shadow.card,
  },
  label: { fontSize: 13, fontWeight: "700", color: theme.color.textMuted },
  labelActive: { color: theme.color.primaryDeep },
});
