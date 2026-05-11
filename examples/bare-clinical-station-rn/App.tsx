/**
 * Clinical Station — production-grade RN demo of every
 * @ohm_studio/sdk-react-native feature.
 *
 * Tabs:
 *   Home     — 3 capture flows (vitals/sync, doctor note/sync, nurse shift/sync)
 *   Async    — long-recording + jobs.create + poll OR webhook flow
 *   Catalog  — apis.list / apis.get + per-API "how to call" snippets
 *   Tools    — text extract / summarize / errors / restoreTokens / audit / queue / languages
 *
 * All screens read patient context from a top-level `DEMO_PATIENT` so
 * the demo doesn't need login.
 *
 * On a fresh clone (no .env) we render <SetupScreen /> instead of the
 * tabs — never throws on missing key.
 */
import { useEffect } from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar, StyleSheet } from "react-native";
import { OhmProvider } from "@ohm_studio/sdk-react-native/react";

import { ohm, isConfigured } from "./src/lib/ohm-client";
import { theme } from "./src/lib/theme";
import { ConnectivityBanner } from "./src/components/ConnectivityBanner";
import { Icon, type IconName } from "./src/components/Icon";
import { SetupScreen } from "./src/screens/SetupScreen";
import { HomeStack } from "./src/screens/HomeStack";
import { AsyncJobsScreen } from "./src/screens/AsyncJobsScreen";
import { ApiCatalogScreen } from "./src/screens/ApiCatalogScreen";
import { ToolsScreen } from "./src/screens/ToolsScreen";

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.color.canvas,
    card: theme.color.surface,
    border: theme.color.line,
    primary: theme.color.primary,
    text: theme.color.text,
  },
};

export default function App() {
  // Warm the OHM connection at app boot — drops first-call latency
  // from ~500 ms to ~150 ms on real-world mobile networks. Safe in
  // setup mode too (the optional-call is a no-op when ohm is null).
  // See: docs.ohm.doctor/sdk/performance#warm-up-the-connection
  useEffect(() => {
    void ohm?.warmUp();
  }, []);

  if (!isConfigured || !ohm) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={theme.color.canvas} />
        <SetupScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <OhmProvider client={ohm}>
        <StatusBar barStyle="dark-content" backgroundColor={theme.color.canvas} />
        <ConnectivityBanner />
        <NavigationContainer theme={navTheme}>
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: theme.color.primary,
              tabBarInactiveTintColor: theme.color.textMuted,
              tabBarStyle: styles.tabBar,
              tabBarLabelStyle: styles.tabLabel,
              tabBarItemStyle: { paddingVertical: 4 },
            }}
          >
            <Tab.Screen
              name="Home"
              component={HomeStack}
              options={{
                tabBarIcon: tabIcon("home", "homeFilled"),
              }}
            />
            <Tab.Screen
              name="Async"
              component={AsyncJobsScreen}
              options={{
                tabBarIcon: tabIcon("async", "asyncFilled"),
              }}
            />
            <Tab.Screen
              name="Catalog"
              component={ApiCatalogScreen}
              options={{
                tabBarIcon: tabIcon("catalog", "catalogFilled"),
              }}
            />
            <Tab.Screen
              name="Tools"
              component={ToolsScreen}
              options={{
                tabBarIcon: tabIcon("tools", "toolsFilled"),
              }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </OhmProvider>
    </SafeAreaProvider>
  );
}

/**
 * Returns a tab-icon renderer that swaps the outline / filled
 * Ionicons variant on focus. Same visual rhythm as iOS native tabs.
 */
function tabIcon(idle: IconName, focused: IconName) {
  return ({ color, focused: isFocused }: { color: string; focused: boolean }) => (
    <Icon name={isFocused ? focused : idle} size={24} color={color} />
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.color.surface,
    borderTopColor: theme.color.line,
    borderTopWidth: 1,
    height: 72,
    paddingTop: 8,
    paddingBottom: 12,
  },
  tabLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.2, marginTop: 2 },
});
