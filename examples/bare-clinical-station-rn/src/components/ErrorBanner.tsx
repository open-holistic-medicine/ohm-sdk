import { StyleSheet, Text, View } from "react-native";
import { Icon } from "./Icon";
import { theme } from "../lib/theme";

/**
 * Inline error bar — used wherever an SDK call can throw. Pairs with
 * the typed `OHM*Error` classes: pass `code` so the user sees the
 * machine-readable code alongside the message (good for support).
 */
export function ErrorBanner({
  message,
  code,
  hint,
}: {
  message: string;
  code?: string | null;
  hint?: string;
}) {
  return (
    <View style={s.wrap}>
      <View style={s.iconWrap}>
        <Icon name="error" size={20} color={theme.color.danger} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>{code ? `Error · ${code}` : "Error"}</Text>
        <Text style={s.body}>{message}</Text>
        {hint ? <Text style={s.hint}>{hint}</Text> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: theme.color.dangerSoft,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    gap: 10,
  },
  iconWrap: { paddingTop: 1 },
  title: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.color.danger,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  body: { fontSize: 14, color: "#7F1D1D", lineHeight: 20 },
  hint: {
    fontSize: 13,
    color: "#7F1D1D",
    marginTop: 6,
    fontStyle: "italic",
    lineHeight: 18,
  },
});
