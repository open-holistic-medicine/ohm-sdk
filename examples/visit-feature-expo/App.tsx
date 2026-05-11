/**
 * OHM Visit — end-to-end Expo demo.
 *
 * Three screens:
 *   1. VisitList       — past visits (AsyncStorage)
 *   2. NewVisit        — record consult, auto-extract via useRecorder
 *   3. VisitDetail     — view a saved visit
 *
 * Wraps everything in <OhmProvider> so the useRecorder hook can do
 * auto-extract on stop. Reads EXPO_PUBLIC_OHM_TEST_KEY at build time.
 *
 * If the key isn't set, we render <Setup /> instead of crashing —
 * never show a blank Metro screen on a fresh clone.
 */
import { useMemo } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { OHM } from "@ohm_studio/sdk-react-native";
import { OhmProvider } from "@ohm_studio/sdk-react-native/react";
import { VisitListScreen } from "./src/screens/VisitListScreen";
import { NewVisitScreen } from "./src/screens/NewVisitScreen";
import { VisitDetailScreen } from "./src/screens/VisitDetailScreen";

export type RootStackParamList = {
  VisitList: undefined;
  NewVisit: undefined;
  VisitDetail: { visitId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const TEST_KEY = process.env.EXPO_PUBLIC_OHM_TEST_KEY as string | undefined;
const isConfigured = !!TEST_KEY && TEST_KEY.startsWith("ohms_test_");

export default function App() {
  if (!isConfigured) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Setup />
      </SafeAreaProvider>
    );
  }
  return <Configured apiKey={TEST_KEY as string} />;
}

function Configured({ apiKey }: { apiKey: string }) {
  const ohm = useMemo(
    () =>
      new OHM({
        apiKey,
        baseUrl: "https://api.ohm.doctor",
        // Dev-only override — safe for ohms_test_*. Live keys are
        // rejected by the SDK in RN bundles even with this flag set
        // unless you explicitly opt in (don't, in production).
        acknowledgeBundledKey: true,
      }),
    [apiKey],
  );

  return (
    <SafeAreaProvider>
      <OhmProvider client={ohm}>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="VisitList"
            screenOptions={{
              headerStyle: { backgroundColor: "#f8fafc" },
              headerTitleStyle: { fontWeight: "700" },
            }}
          >
            <Stack.Screen
              name="VisitList"
              component={VisitListScreen}
              options={{ title: "OHM Visit" }}
            />
            <Stack.Screen
              name="NewVisit"
              component={NewVisitScreen}
              options={{ title: "New visit" }}
            />
            <Stack.Screen
              name="VisitDetail"
              component={VisitDetailScreen}
              options={{ title: "Visit" }}
            />
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="auto" />
      </OhmProvider>
    </SafeAreaProvider>
  );
}

function Setup() {
  return (
    <View style={s.root}>
      <View style={s.card}>
        <Text style={s.title}>Set up your OHM key</Text>
        <Text style={s.body}>
          Add a test-mode key to <Text style={s.code}>.env</Text> in this
          project root, then restart Expo with the cache cleared:
        </Text>
        <View style={s.codeBlock}>
          <Text style={s.codeLine}>cp .env.example .env</Text>
          <Text style={s.codeLine}>
            {`# edit .env: EXPO_PUBLIC_OHM_TEST_KEY=ohms_test_xxx`}
          </Text>
          <Text style={s.codeLine}>npx expo start --clear</Text>
        </View>
        <Text style={s.body}>
          Mint a test key in Studio (Keys tab → New key → Reveal). Live keys
          (ohms_live_*) are rejected — your backend should hold those, never
          the mobile bundle.
        </Text>
        <Pressable
          onPress={() =>
            Linking.openURL("https://docs.ohm.doctor/security/rn-key-handling")
          }
        >
          <Text style={s.link}>Read the RN key-handling guide ↗</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    padding: 24,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 24,
    width: "100%",
    maxWidth: 480,
  },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  body: { fontSize: 14, color: "#0f172a", lineHeight: 21, marginBottom: 12 },
  code: {
    fontFamily: "Courier",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  codeBlock: {
    backgroundColor: "#0f172a",
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  codeLine: {
    color: "#94e2d5",
    fontFamily: "Courier",
    fontSize: 13,
    lineHeight: 20,
  },
  link: { color: "#0f766e", fontWeight: "700", fontSize: 14, marginTop: 8 },
});
