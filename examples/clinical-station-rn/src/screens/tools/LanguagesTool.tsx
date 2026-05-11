/**
 * Tools → Languages — read-only reference of every language the
 * SDK supports for STT (`audio.transcribe` + `audio.extract`).
 *
 * Source of truth: SUPPORTED_LANGUAGES exported from sdk-core.
 * This is one of the platform's biggest moats — 23 Indian + global
 * languages with a single `language: "auto"` flag.
 */
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  SPEAKER_MODES,
  SUPPORTED_LANGUAGES,
} from "@ohm_studio/sdk-react-native";
import { theme } from "../../lib/theme";
import { Card } from "../../components/Card";
import { Pill } from "../../components/Pill";

export function LanguagesTool() {
  return (
    <ScrollView contentContainerStyle={s.scroll}>
      <Card
        title={`Languages · ${SUPPORTED_LANGUAGES.length}`}
        subtitle='Pass "auto" to let the server detect, or pin a code for stricter STT.'
      >
        <View style={s.langGrid}>
          {SUPPORTED_LANGUAGES.map((l) => (
            <View key={l.code} style={s.langRow}>
              <Text style={s.langCode}>{l.code}</Text>
              <Text style={s.langName}>{l.label}</Text>
              {l.nativeLabel ? (
                <Text style={s.langNative}>{l.nativeLabel}</Text>
              ) : null}
            </View>
          ))}
        </View>
      </Card>

      <Card title="Speaker modes" style={s.gap}>
        <View style={{ gap: 8 }}>
          {SPEAKER_MODES.map((m) => (
            <View key={m.code} style={s.modeRow}>
              <Pill label={m.code} tone="primary" />
              <Text style={s.modeDesc}>{m.description}</Text>
            </View>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { padding: theme.space.lg, paddingBottom: theme.space.xxl, gap: theme.space.md },
  langGrid: { gap: 6 },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.lineSoft,
  },
  langCode: {
    width: 60,
    fontFamily: theme.font.mono.fontFamily,
    fontSize: 14,
    color: theme.color.primary,
    fontWeight: "700",
  },
  langName: { flex: 1, fontSize: 15, color: theme.color.text, fontWeight: "600" },
  langNative: { fontSize: 14, color: theme.color.textMuted },
  gap: { marginTop: theme.space.md },
  modeRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  modeDesc: { flex: 1, fontSize: 13, color: theme.color.textMuted, lineHeight: 20 },
});
