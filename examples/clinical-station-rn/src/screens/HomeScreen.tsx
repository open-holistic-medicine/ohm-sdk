/**
 * Home tab landing — patient header + 3 capture cards. Each card
 * pushes its capture flow onto the Home stack.
 */
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { theme } from "../lib/theme";
import { Card } from "../components/Card";
import { Icon, type IconName } from "../components/Icon";
import { Pill } from "../components/Pill";
import { DEMO_PATIENT, DEMO_DOCTOR, type HomeStackParamList } from "./HomeStack";

type Nav = NativeStackNavigationProp<HomeStackParamList>;

export function HomeScreen() {
  const nav = useNavigation<Nav>();
  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.greeting}>
          <Text style={s.eyebrow}>Today · {DEMO_DOCTOR.name}</Text>
          <Text style={s.title}>Clinical station</Text>
        </View>

        <Card
          title={DEMO_PATIENT.name}
          subtitle={`Bed ${DEMO_PATIENT.bedNumber} · ${DEMO_PATIENT.age}y · MRN p_demo_001`}
          right={<Pill label="ADMITTED" tone="success" />}
        >
          <View style={s.row}>
            <View style={s.fact}>
              <Text style={s.factLabel}>Last vitals</Text>
              <Text style={s.factValue}>—</Text>
            </View>
            <View style={s.divider} />
            <View style={s.fact}>
              <Text style={s.factLabel}>Last note</Text>
              <Text style={s.factValue}>—</Text>
            </View>
            <View style={s.divider} />
            <View style={s.fact}>
              <Text style={s.factLabel}>Allergies</Text>
              <Text style={s.factValue}>NKDA</Text>
            </View>
          </View>
        </Card>

        <Text style={s.sectionLabel}>Capture clinical data</Text>

        <ActionCard
          title="Record vitals"
          subtitle="7-field bedside check · sync extraction · ~4 s"
          accent="primary"
          icon="vitals"
          onPress={() => nav.navigate("Vitals")}
        />
        <ActionCard
          title="Add doctor note"
          subtitle="Voice → Markdown observations + plan"
          accent="info"
          icon="doctorNote"
          onPress={() => nav.navigate("DoctorNote")}
        />
        <ActionCard
          title="Submit shift handover"
          subtitle="SOAP + timeline + ISBARR in one dictation"
          accent="primary"
          icon="shiftHandover"
          onPress={() => nav.navigate("NurseShift")}
        />

        <Text style={s.footnote}>
          Other tabs demo every other SDK feature: long-running async jobs,
          published-API catalog, and a tools playground for text extract,
          summarise, errors, PHI restore, audit search, offline queue.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionCard({
  title,
  subtitle,
  accent,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  accent: "primary" | "info";
  icon: IconName;
  onPress: () => void;
}) {
  const tint =
    accent === "info" ? theme.color.infoSoft : theme.color.primarySoft;
  const fg = accent === "info" ? theme.color.info : theme.color.primary;
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: tint }}
      style={({ pressed }) => [s.actionCard, pressed && { opacity: 0.85 }]}
    >
      <View style={[s.actionIconWrap, { backgroundColor: tint }]}>
        <Icon name={icon} size={24} color={fg} />
      </View>
      <View style={s.actionBody}>
        <Text style={s.actionTitle}>{title}</Text>
        <Text style={s.actionSubtitle}>{subtitle}</Text>
      </View>
      <Icon name="forward" size={22} color={theme.color.textFaint} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.canvas },
  scroll: {
    padding: theme.space.lg,
    paddingBottom: theme.space.xxl,
    gap: theme.space.md,
  },
  greeting: { marginTop: theme.space.sm, marginBottom: theme.space.md },
  eyebrow: { ...theme.font.label, color: theme.color.primary, marginBottom: 6 },
  title: theme.font.h1,

  row: { flexDirection: "row", alignItems: "stretch", marginTop: 4 },
  fact: { flex: 1 },
  factLabel: {
    ...theme.font.label,
    color: theme.color.textMuted,
    marginBottom: 6,
  },
  factValue: { fontSize: 16, fontWeight: "700", color: theme.color.text },
  divider: {
    width: 1,
    backgroundColor: theme.color.lineSoft,
    marginHorizontal: 14,
  },

  sectionLabel: {
    ...theme.font.label,
    color: theme.color.textMuted,
    marginTop: theme.space.lg,
    marginBottom: theme.space.xs,
  },

  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.color.line,
    paddingVertical: 14,
    paddingHorizontal: 14,
    ...theme.shadow.card,
  },
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  actionBody: { flex: 1 },
  actionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.color.text,
    letterSpacing: -0.1,
  },
  actionSubtitle: {
    fontSize: 13,
    color: theme.color.textMuted,
    marginTop: 3,
    lineHeight: 18,
  },

  footnote: {
    marginTop: theme.space.lg,
    fontSize: 13,
    color: theme.color.textMuted,
    fontStyle: "italic",
    lineHeight: 20,
  },
});
