import { StyleSheet, Text, View, type ViewProps } from "react-native";
import { theme } from "../lib/theme";

export interface CardProps extends ViewProps {
  title?: string;
  subtitle?: string;
  /** Slot rendered top-right (e.g. status pill). */
  right?: React.ReactNode;
  /** Compact = 12px padding instead of 16/20. */
  compact?: boolean;
  /** Highlight border in brand color (e.g. featured card). */
  featured?: boolean;
  children?: React.ReactNode;
}

/**
 * Flat-with-shadow card with an optional title / subtitle / right-slot
 * header. The header is optional; pass `children` only for a plain
 * paneled container.
 */
export function Card({
  title,
  subtitle,
  right,
  compact,
  featured,
  children,
  style,
  ...rest
}: CardProps) {
  return (
    <View
      style={[s.card, compact && s.compact, featured && s.featured, style]}
      {...rest}
    >
      {(title || subtitle || right) && (
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            {title && <Text style={s.title}>{title}</Text>}
            {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
          </View>
          {right ? <View style={{ marginLeft: 12 }}>{right}</View> : null}
        </View>
      )}
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.color.line,
    padding: theme.space.lg,
    ...theme.shadow.card,
  },
  compact: { padding: theme.space.md },
  featured: { borderColor: theme.color.primary, borderWidth: 1.5 },
  header: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  title: { ...theme.font.h3, marginBottom: 4 },
  subtitle: { ...theme.font.small },
});
