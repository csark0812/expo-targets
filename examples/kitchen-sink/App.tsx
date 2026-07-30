import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ksActionTarget } from "./targets/ks-action";
import { ksClipTarget } from "./targets/ks-clip";
import { ksMessagesTarget } from "./targets/ks-messages";
import { ksShareTarget } from "./targets/ks-share";
import { ksWidget } from "./targets/ks-widgets";

// Stickers omitted: iOS allows only one message-payload-provider extension
// per app (messages OR stickers). See examples/stickers for the stickers path.

const sections = [
  {
    prefix: "ks-share",
    seed: () =>
      ksShareTarget.setData({ items: [{ id: "seed", source: "host" }] }),
    clear: () => ksShareTarget.setData({ items: [] }),
    read: () =>
      JSON.stringify(
        ksShareTarget.getData<{ items: unknown[] }>()?.items ?? [],
      ),
  },
  {
    prefix: "ks-action",
    seed: () =>
      ksActionTarget.setData({ items: [{ id: "seed", filter: "grayscale" }] }),
    clear: () => ksActionTarget.setData({ items: [] }),
    read: () =>
      JSON.stringify(
        ksActionTarget.getData<{ items: unknown[] }>()?.items ?? [],
      ),
  },
  {
    prefix: "ks-clip",
    seed: () =>
      ksClipTarget.setData({
        itemName: "ks clip item",
        price: "$5.00",
        timestamp: Date.now(),
      }),
    clear: () => ksClipTarget.setData({}),
    read: () => JSON.stringify(ksClipTarget.getData() ?? {}),
  },
  {
    prefix: "ks-widgets",
    seed: () => {
      ksWidget.setData({ message: "ks widget seed" });
      ksWidget.refresh();
    },
    clear: () => {
      ksWidget.setData({ message: "" });
      ksWidget.refresh();
    },
    read: () => ksWidget.getData<{ message?: string }>()?.message ?? "none",
  },
  {
    prefix: "ks-messages",
    seed: () =>
      ksMessagesTarget.setData({
        messages: [
          {
            id: "seed",
            caption: "ks messages",
            sentAt: new Date().toISOString(),
          },
        ],
      }),
    clear: () => ksMessagesTarget.setData({ messages: [] }),
    read: () =>
      JSON.stringify(
        ksMessagesTarget.getData<{ messages: unknown[] }>()?.messages ?? [],
      ),
  },
] as const;

export default function App() {
  const [ready, setReady] = useState(false);
  const [payloads, setPayloads] = useState<Record<string, string>>({});

  const refresh = useCallback(() => {
    setPayloads(Object.fromEntries(sections.map((s) => [s.prefix, s.read()])));
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ScrollView contentContainerStyle={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>Kitchen Sink</Text>
      <Text testID="status-target-ready">{ready ? "ready" : "loading"}</Text>
      {sections.map((section) => (
        <View key={section.prefix} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.prefix}</Text>
          {/* Payload above actions so Maestro can assert it after scrolling to Seed */}
          <Text
            testID={`${section.prefix}-text-last-payload`}
            style={styles.payload}
          >
            {payloads[section.prefix] ?? "none"}
          </Text>
          <TouchableOpacity
            testID={`${section.prefix}-btn-seed-payload`}
            style={styles.button}
            onPress={() => {
              section.seed();
              refresh();
            }}
          >
            <Text style={styles.buttonText}>Seed</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID={`${section.prefix}-btn-clear-payload`}
            style={styles.button}
            onPress={() => {
              section.clear();
              refresh();
            }}
          >
            <Text style={styles.buttonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "700", marginTop: 48 },
  section: { gap: 8, padding: 12, backgroundColor: "#f5f5f5", borderRadius: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "600" },
  button: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  payload: { fontFamily: "Courier", fontSize: 11 },
});
