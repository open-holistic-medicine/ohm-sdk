import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../lib/theme";

/**
 * Shown on a fresh clone (no EXPO_PUBLIC_OHM_API_KEY in .env). Gives
 * the developer a copy-paste path to a working app — no blank loading
 * screen, no cryptic Metro error.
 */
export function SetupScreen() {
  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <View style={s.card}>
        <Text style={s.title}>Set up your OHM key</Text>
        <Text style={s.body}>
          Add a test-mode key to <Text style={s.code}>.env</Text> in this
          project root, then restart Expo with the cache cleared:
        </Text>
        <View style={s.codeBlock}>
          <Text style={s.codeLine}>cp .env.example .env</Text>
          <Text style={s.codeLine}>{`# edit .env: EXPO_PUBLIC_OHM_API_KEY=ohms_test_xxx`}</Text>
          <Text style={s.codeLine}>npx expo start --clear</Text>
        </View>
        <Text style={s.body}>
          Mint a test key in Studio (Keys tab → New key → Reveal). Live
          keys (ohms_live_*) are rejected — your backend should hold those,
          never the mobile bundle.
        </Text>
        <Pressable
          onPress={() =>
            Linking.openURL("https://docs.ohm.doctor/security/rn-key-handling")
          }
          style={s.docsLink}
        >
          <Text style={s.docsLinkText}>Read the RN key-handling guide ↗</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.color.canvas,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.space.lg,
  },
  card: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.color.line,
    padding: theme.space.xl,
    width: "100%",
    maxWidth: 480,
    ...theme.shadow.card,
  },
  title: { ...theme.font.h1, marginBottom: 14 },
  body: {
    fontSize: 15,
    color: theme.color.text,
    lineHeight: 23,
    marginBottom: 14,
  },
  code: {
    fontFamily: theme.font.mono.fontFamily,
    backgroundColor: theme.color.canvasDeep,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  codeBlock: {
    backgroundColor: "#0f172a",
    borderRadius: theme.radius.md,
    padding: 16,
    marginBottom: 16,
  },
  codeLine: {
    color: "#94e2d5",
    fontFamily: theme.font.mono.fontFamily,
    fontSize: 14,
    lineHeight: 22,
  },
  docsLink: { marginTop: 8 },
  docsLinkText: {
    color: theme.color.primary,
    fontWeight: "700",
    fontSize: 15,
  },
});
