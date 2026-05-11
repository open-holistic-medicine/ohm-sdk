import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Network from "expo-network";
import { Icon } from "./Icon";
import { theme } from "../lib/theme";

/**
 * Top-of-screen banner that appears only when the device is offline.
 * Polls expo-network every 4 s — cheap and reliable on real devices.
 * Don't show when online: zero-config "ambient" connectivity hint.
 */
export function ConnectivityBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const s = await Network.getNetworkStateAsync();
        if (!alive) return;
        setOnline(!!s.isInternetReachable || !!s.isConnected);
      } catch {
        if (alive) setOnline(true);
      }
    };
    void check();
    const id = setInterval(() => void check(), 4000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (online) return null;
  return (
    <View style={s.bar}>
      <Icon name="offline" size={16} color="white" />
      <Text style={s.text}>Offline — calls will be queued for replay</Text>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    backgroundColor: theme.color.warn,
    paddingVertical: 9,
    paddingHorizontal: theme.space.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  text: { color: "white", fontSize: 13, fontWeight: "700" },
});
