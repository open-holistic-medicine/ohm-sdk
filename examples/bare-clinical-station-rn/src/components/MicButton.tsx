import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Haptics } from "../lib/native-bridges";
import { Icon } from "./Icon";
import { theme } from "../lib/theme";

export interface MicButtonProps {
  /** "idle" → tap to record, "recording" → tap to stop, "extracting" → spinner. */
  state: "idle" | "recording" | "extracting";
  onPress: () => void;
  /** Linear 0–1 audio level — drives the 9-bar visualizer when recording. */
  level?: number;
  /** Live duration in seconds (shown next to the bar visualizer). */
  durationSec?: number;
  /** Optional hint shown below the button (e.g. "auto-stops after 8s of silence"). */
  hint?: string;
}

/**
 * OHM-brand recording button — ported from
 * `apps/web/src/components/visits/AudioRecorder.tsx` (the production
 * doctor-app recorder). Same energy: a primary-tinted PILL containing
 * a tiny red dot + bar visualizer + tabular timer, paired with a stop
 * button alongside. Live coaching microcopy below.
 *
 *   IDLE         ┌─────────────────────────────────┐
 *                │   🎤  Record                     │   primary, full width
 *                └─────────────────────────────────┘
 *                  auto-stops after 8 s of silence    hint
 *
 *   RECORDING    ┌──────────────────────┐  ┌──────┐
 *                │ ● ▌▎▍▆▎▌▎▍▌  · 12s   │  │ ⏹ Stop│
 *                │      primary-tinted   │  │primary│
 *                └──────────────────────┘  └──────┘
 *                  ● Speaking clearly                  coaching
 *
 *   EXTRACTING   ┌─────────────────────────────────┐
 *                │   ⏳  Extracting…                 │   muted + spinner
 *                └─────────────────────────────────┘
 */
export function MicButton({
  state,
  onPress,
  level = 0,
  durationSec,
  hint,
}: MicButtonProps) {
  const handle = () => {
    try {
      void Haptics.impactAsync(
        state === "recording"
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light,
      );
    } catch {
      /* ignore */
    }
    onPress();
  };

  const isRecording = state === "recording";
  const isBusy = state === "extracting";

  // ── Red dot — gentle 1.4 s blink (matches doctor-app's `animate-pulse`).
  const dot = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isRecording) {
      dot.stopAnimation();
      dot.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dot, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isRecording, dot]);
  const dotOpacity = dot.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] });

  // ── Idle / extracting palette
  const idleBg = isBusy ? theme.color.textMuted : theme.color.primary;
  const label = isBusy ? "Extracting…" : "Record";

  return (
    <View style={s.wrap}>
      {!isRecording ? (
        // ── IDLE / EXTRACTING — single full-width primary button.
        <Pressable
          onPress={handle}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel={isBusy ? "Extracting, please wait" : "Start recording"}
          style={[s.btn, { backgroundColor: idleBg }]}
        >
          {isBusy ? (
            <ActivityIndicator color="white" />
          ) : (
            <Icon name="mic" size={22} color="white" />
          )}
          <Text style={s.btnLabel}>{label}</Text>
        </Pressable>
      ) : (
        // ── RECORDING — pill (dot + bars + timer) | Stop button | coaching line
        <>
          <View style={s.row}>
            <View style={s.pill}>
              <Animated.View style={[s.dot, { opacity: dotOpacity }]} />
              <LevelBars level={level} />
              {durationSec != null && (
                <Text style={s.pillTime}>{Math.round(durationSec)}s</Text>
              )}
            </View>
            <Pressable
              onPress={handle}
              accessibilityRole="button"
              accessibilityLabel="Stop recording"
              style={s.stopBtn}
            >
              <Icon name="stop" size={20} color="white" />
              <Text style={s.btnLabel}>Stop</Text>
            </Pressable>
          </View>
          <CoachingLine level={level} />
        </>
      )}

      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

/**
 * 9 vertical bars driven by the live audio level. Each bar's height is
 * `baseHeight + phase-shifted oscillation` so the row reads as a live
 * waveform instead of a single pulsing block. Same visual language as
 * the doctor-app's `audioLevels.map(...)` mini-bar visualizer.
 */
function LevelBars({ level }: { level: number }) {
  const phase = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(phase, { toValue: 1, duration: 650, useNativeDriver: false }),
        Animated.timing(phase, { toValue: 0, duration: 650, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase]);

  const baseHeight = 6 + Math.min(20, level * 80);
  return (
    <View style={s.bars}>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
        const offset = Math.abs(i - 4);
        const animatedHeight = phase.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [
            Math.max(4, baseHeight - offset * 1.5),
            baseHeight + (i % 2 === 0 ? 3 : 1),
            Math.max(4, baseHeight - offset * 1.5),
          ],
        });
        return (
          <Animated.View key={i} style={[s.bar, { height: animatedHeight }]} />
        );
      })}
    </View>
  );
}

/**
 * Coaching microcopy — colored dot + label. Same 4-state model as the
 * doctor app: silent / low / good / loud. Real-time feedback helps the
 * clinician self-correct without us spamming a toast.
 */
function CoachingLine({ level }: { level: number }) {
  const { dotColor, text, textColor } = (() => {
    if (level < 0.03)
      return {
        dotColor: theme.color.textFaint,
        text: "Listening…",
        textColor: theme.color.textMuted,
      };
    if (level < 0.12)
      return {
        dotColor: theme.color.warn,
        text: "Speak louder or move closer to the mic",
        textColor: theme.color.warn,
      };
    if (level < 0.75)
      return {
        dotColor: theme.color.success,
        text: "Speaking clearly",
        textColor: theme.color.success,
      };
    return {
      dotColor: theme.color.danger,
      text: "Too loud — please reduce volume",
      textColor: theme.color.danger,
    };
  })();
  return (
    <View style={s.coach}>
      <View style={[s.coachDot, { backgroundColor: dotColor }]} />
      <Text style={[s.coachText, { color: textColor }]}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: "100%", alignItems: "stretch", gap: 8 },

  // ── Idle / extracting — full-width 56 px pill.
  btn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 56,
    borderRadius: 28,
    ...theme.shadow.card,
  },
  btnLabel: { fontSize: 16, fontWeight: "700", letterSpacing: -0.1, color: "white" },

  // ── Recording — pill + stop button row.
  row: { flexDirection: "row", alignItems: "stretch", gap: 10 },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: theme.color.primarySoft,
    borderColor: theme.color.primary,
    borderWidth: 1,
    borderRadius: 28,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.color.danger,
  },
  pillTime: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.color.primaryDeep,
    fontVariant: ["tabular-nums"],
    minWidth: 32,
    textAlign: "right",
  },
  bars: { flex: 1, flexDirection: "row", alignItems: "center", height: 28, gap: 3 },
  bar: {
    width: 3,
    minHeight: 4,
    borderRadius: 2,
    backgroundColor: theme.color.primary,
  },

  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
    borderRadius: 28,
    backgroundColor: theme.color.primary,
    ...theme.shadow.card,
  },

  // ── Coaching line.
  coach: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4 },
  coachDot: { width: 6, height: 6, borderRadius: 3 },
  coachText: { fontSize: 12, fontWeight: "600" },

  hint: {
    fontSize: 13,
    color: theme.color.textMuted,
    textAlign: "center",
    marginTop: 4,
  },
});
