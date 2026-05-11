import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "./Icon";
import { theme } from "../lib/theme";

export interface PatientHeaderProps {
  title: string;
  subtitle?: string;
  /** Tap target on the right edge — e.g. close icon or menu. */
  onClose?: () => void;
}

/**
 * Sticky header used on all capture screens — title left, optional
 * close button right, thin border-bottom for separation.
 */
export function PatientHeader({ title, subtitle, onClose }: PatientHeaderProps) {
  return (
    <View style={s.wrap}>
      <View style={{ flex: 1 }}>
        <Text style={s.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={s.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {onClose ? (
        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={s.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Icon name="close" size={20} color={theme.color.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    minHeight: 60,
    paddingHorizontal: theme.space.lg,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: theme.color.line,
    backgroundColor: theme.color.surface,
  },
  title: theme.font.h2,
  subtitle: { ...theme.font.small, marginTop: 3 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.color.canvas,
  },
});
