/**
 * Native-bridge shims — keep the rest of the app source identical to the
 * Expo version by exposing the same call surfaces over bare-RN libraries.
 *
 * - Haptics  → react-native-haptic-feedback
 * - Clipboard → @react-native-clipboard/clipboard
 * - Network  → @react-native-community/netinfo
 *
 * The screens import these as `{ Haptics, Clipboard, Network }` and call
 * `Haptics.impactAsync(...)`, `Clipboard.setStringAsync(...)`,
 * `Network.getNetworkStateAsync()` — same as Expo. Swap a screen back to
 * Expo by changing this file's imports; nothing else needs to move.
 */
import RNHaptic from "react-native-haptic-feedback";
import RNClipboard from "@react-native-clipboard/clipboard";
import NetInfo from "@react-native-community/netinfo";

/* ─── Haptics ──────────────────────────────────────────────────────── */

export const ImpactFeedbackStyle = {
  Light: "Light",
  Medium: "Medium",
  Heavy: "Heavy",
} as const;
export type ImpactFeedbackStyle =
  (typeof ImpactFeedbackStyle)[keyof typeof ImpactFeedbackStyle];

export const NotificationFeedbackType = {
  Success: "Success",
  Warning: "Warning",
  Error: "Error",
} as const;
export type NotificationFeedbackType =
  (typeof NotificationFeedbackType)[keyof typeof NotificationFeedbackType];

const IMPACT_MAP = {
  Light: "impactLight",
  Medium: "impactMedium",
  Heavy: "impactHeavy",
} as const;

const NOTIFY_MAP = {
  Success: "notificationSuccess",
  Warning: "notificationWarning",
  Error: "notificationError",
} as const;

const HAPTIC_OPTS = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export const Haptics = {
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  async impactAsync(style: ImpactFeedbackStyle = "Light") {
    try {
      RNHaptic.trigger(IMPACT_MAP[style], HAPTIC_OPTS);
    } catch {
      /* not critical */
    }
  },
  async notificationAsync(type: NotificationFeedbackType = "Success") {
    try {
      RNHaptic.trigger(NOTIFY_MAP[type], HAPTIC_OPTS);
    } catch {
      /* not critical */
    }
  },
};

/* ─── Clipboard ────────────────────────────────────────────────────── */

export const Clipboard = {
  async setStringAsync(text: string): Promise<boolean> {
    try {
      RNClipboard.setString(text);
      return true;
    } catch {
      return false;
    }
  },
  async getStringAsync(): Promise<string> {
    try {
      return await RNClipboard.getString();
    } catch {
      return "";
    }
  },
};

/* ─── Network ──────────────────────────────────────────────────────── */

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type?: string;
}

export const Network = {
  async getNetworkStateAsync(): Promise<NetworkState> {
    try {
      const s = await NetInfo.fetch();
      return {
        isConnected: !!s.isConnected,
        isInternetReachable: s.isInternetReachable,
        type: s.type,
      };
    } catch {
      // Optimistic fallback so a broken probe doesn't show a false
      // "offline" banner. Real offline state still surfaces via the
      // SDK's own request errors.
      return { isConnected: true, isInternetReachable: true };
    }
  },
};
