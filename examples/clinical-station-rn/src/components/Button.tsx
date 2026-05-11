import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { theme } from "../lib/theme";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps {
  label: string;
  onPress?: () => void | Promise<unknown>;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  testID?: string;
}

/**
 * Tactile button with haptic feedback. Loading state shows a spinner
 * inline so a button mid-async-call doesn't shift width.
 */
export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  fullWidth,
  icon,
  testID,
}: ButtonProps) {
  const handle = async () => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      /* ignore */
    }
    await onPress?.();
  };
  const palette = paletteFor(variant);
  const dim = disabled || loading;
  return (
    <Pressable
      testID={testID}
      onPress={handle}
      disabled={dim}
      android_ripple={{ color: palette.ripple }}
      style={({ pressed }) => [
        s.base,
        s[size],
        { backgroundColor: palette.bg, borderColor: palette.border },
        fullWidth && s.fullWidth,
        pressed && !dim && { opacity: 0.85 },
        dim && s.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={s.row}>
          {icon ? <View style={{ marginRight: 8 }}>{icon}</View> : null}
          <Text
            style={[
              s.label,
              size === "sm" && s.labelSm,
              size === "lg" && s.labelLg,
              { color: palette.fg },
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function paletteFor(v: Variant) {
  if (v === "secondary") {
    return {
      bg: theme.color.surface,
      border: theme.color.line,
      fg: theme.color.primary,
      ripple: theme.color.primarySoft,
    };
  }
  if (v === "ghost") {
    return {
      bg: "transparent",
      border: "transparent",
      fg: theme.color.primary,
      ripple: theme.color.primarySoft,
    };
  }
  if (v === "danger") {
    return {
      bg: theme.color.danger,
      border: theme.color.danger,
      fg: "white",
      ripple: theme.color.dangerSoft,
    };
  }
  return {
    bg: theme.color.primary,
    border: theme.color.primary,
    fg: "white",
    ripple: theme.color.primaryDeep,
  };
}

const s = StyleSheet.create({
  base: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sm: { paddingVertical: 9, paddingHorizontal: 14 },
  md: { paddingVertical: 13, paddingHorizontal: 18 },
  lg: { paddingVertical: 16, paddingHorizontal: 24 },
  fullWidth: { alignSelf: "stretch" },
  disabled: { opacity: 0.5 },
  row: { flexDirection: "row", alignItems: "center" },
  label: { fontSize: 15, fontWeight: "700", letterSpacing: 0.1 },
  labelSm: { fontSize: 13 },
  labelLg: { fontSize: 17 },
});
