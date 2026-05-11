/**
 * Tools tab — segmented control over six sub-tools that exercise the
 * remaining SDK surface:
 *
 *   Text       — ohm.extract({ text })
 *   Summary    — ohm.summarize({ text, style })
 *   Errors     — typed OHM error classes + restoreTokens demo
 *   Audit      — ohm.invocations.searchByPatient
 *   Queue      — OhmQueue offline replay
 *   Languages  — SUPPORTED_LANGUAGES + SPEAKER_MODES catalogue
 */
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../lib/theme";
import { SegmentedControl } from "../components/SegmentedControl";
import { TextExtractTool } from "./tools/TextExtractTool";
import { SummarizeTool } from "./tools/SummarizeTool";
import { ErrorsTool } from "./tools/ErrorsTool";
import { AuditTool } from "./tools/AuditTool";
import { QueueTool } from "./tools/QueueTool";
import { LanguagesTool } from "./tools/LanguagesTool";

type Tool = "text" | "summary" | "errors" | "audit" | "queue" | "lang";

export function ToolsScreen() {
  const [tool, setTool] = useState<Tool>("text");
  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.eyebrow}>Tools</Text>
        <Text style={s.title}>Everything else the SDK does</Text>
      </View>
      <View style={s.segWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: theme.space.lg }}
        >
          <View style={{ width: 580 }}>
            <SegmentedControl
              value={tool}
              onChange={setTool}
              options={[
                { label: "Text", value: "text" },
                { label: "Summary", value: "summary" },
                { label: "Errors", value: "errors" },
                { label: "Audit", value: "audit" },
                { label: "Queue", value: "queue" },
                { label: "Lang", value: "lang" },
              ]}
            />
          </View>
        </ScrollView>
      </View>
      <View style={{ flex: 1 }}>
        {tool === "text" && <TextExtractTool />}
        {tool === "summary" && <SummarizeTool />}
        {tool === "errors" && <ErrorsTool />}
        {tool === "audit" && <AuditTool />}
        {tool === "queue" && <QueueTool />}
        {tool === "lang" && <LanguagesTool />}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.canvas },
  header: { paddingHorizontal: theme.space.lg, paddingTop: theme.space.sm, paddingBottom: 4 },
  eyebrow: { ...theme.font.label, color: theme.color.primary, marginBottom: 6 },
  title: theme.font.h1,
  segWrap: { paddingVertical: theme.space.md },
});
