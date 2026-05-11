import { StyleSheet, Text, View } from "react-native";
import { Icon, type IconName } from "./Icon";
import { theme } from "../lib/theme";

/** Friendly empty-state block for lists / catalog screens. */
export function EmptyState({
  icon = "info",
  title,
  body,
}: {
  icon?: IconName;
  title: string;
  body?: string;
}) {
  return (
    <View style={s.wrap}>
      <View style={s.iconWrap}>
        <Icon name={icon} size={28} color={theme.color.textFaint} />
      </View>
      <Text style={s.title}>{title}</Text>
      {body ? <Text style={s.body}>{body}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.space.xl,
    paddingHorizontal: theme.space.lg,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.color.canvasDeep,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: { ...theme.font.h3, color: theme.color.text, marginBottom: 6, textAlign: "center" },
  body: {
    ...theme.font.small,
    textAlign: "center",
    maxWidth: 320,
    lineHeight: 20,
  },
});
