/**
 * Design tokens — one source of truth for color, type, spacing, radii
 * and shadows. Every screen reads from `theme.*` — never a literal.
 *
 * 2026-05 redesign:
 *   • Bumped the type ramp ~1pt across the board. Clinical staff use
 *     tablets at arm's length; 14px body was uncomfortable. Body is
 *     now 15px, supporting captions 14px, eyebrow labels 12px.
 *   • Reduced the label letter-spacing from 1.2 → 0.6. The old value
 *     looked airless in the sidebar.
 *   • Added `font.h0` for hero numerals and `font.kbd` for monospace
 *     inline tokens.
 *   • Added a dedicated `color.icon` token so SVG glyphs don't reach
 *     for an arbitrary text color.
 */
import { Platform } from "react-native";

export const theme = {
  color: {
    // ── Brand ─────────────────────────────────────────────────────
    primary: "#962067",
    primaryDeep: "#7a1853",
    primarySoft: "#FCE9F2",
    accent: "#EE2D67",
    // ── Semantic ──────────────────────────────────────────────────
    success: "#16a34a",
    successSoft: "#DCFCE7",
    warn: "#D97706",
    warnSoft: "#FEF3C7",
    danger: "#dc2626",
    dangerSoft: "#FEE2E2",
    info: "#2563EB",
    infoSoft: "#DBEAFE",
    // ── Surfaces ──────────────────────────────────────────────────
    text: "#0f172a",
    textMuted: "#475569",       // bumped from #64748b for better contrast
    textFaint: "#94a3b8",
    icon: "#334155",            // dedicated icon stroke — sits between text and muted
    line: "#e2e8f0",
    lineSoft: "#f1f5f9",
    surface: "#ffffff",
    canvas: "#FAF9F9",
    canvasDeep: "#F4F0F4",
    inkBlack: "#0f172a",
  },
  radius: { sm: 8, md: 10, lg: 14, xl: 20, pill: 999 },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  font: {
    h0: { fontSize: 30, fontWeight: "800" as const, color: "#0f172a", letterSpacing: -0.6 },
    h1: { fontSize: 24, fontWeight: "800" as const, color: "#0f172a", letterSpacing: -0.4 },
    h2: { fontSize: 19, fontWeight: "700" as const, color: "#0f172a", letterSpacing: -0.2 },
    h3: { fontSize: 16, fontWeight: "700" as const, color: "#0f172a" },
    body: { fontSize: 15, color: "#0f172a", lineHeight: 22 },
    bodyBold: { fontSize: 15, fontWeight: "600" as const, color: "#0f172a", lineHeight: 22 },
    small: { fontSize: 13, color: "#475569", lineHeight: 18 },
    caption: { fontSize: 14, color: "#0f172a", lineHeight: 20 },
    label: {
      fontSize: 12,
      fontWeight: "700" as const,
      color: "#475569",
      textTransform: "uppercase" as const,
      letterSpacing: 0.6,
    },
    mono: {
      fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
      fontSize: 14,
      color: "#0f172a",
    },
    kbd: {
      fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
      fontSize: 13,
      color: "#0f172a",
    },
  },
  shadow: {
    card: {
      shadowColor: "#0f172a",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    floating: {
      shadowColor: "#0f172a",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 8,
    },
  },
};
