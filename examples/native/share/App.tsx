import { StatusBar } from "expo-status-bar";
import { AppGroupStorage } from "expo-targets";
import { useCallback, useEffect, useState } from "react";
import {
  AppState,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const storage = new AppGroupStorage(
  "group.com.expotargets.example.native.share",
);
const STORAGE_KEY = "nativeShare:items";

/** Marker string asserted by ShareSheetSmoke after Save to App. */
export const UITEST_NATIVE_SHARE_MARKER = "expo-targets uitest share payload";

type SharedItem = { type: string; content: string; timestamp: number };

function formatStoredList(
  raw: SharedItem[] | string | null | undefined,
): string {
  if (!raw) return "none";
  const items =
    typeof raw === "string" ? (JSON.parse(raw) as SharedItem[]) : raw;
  return items.length ? JSON.stringify(items) : "none";
}

export default function App() {
  const [payload, setPayload] = useState("none");
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    try {
      setPayload(
        formatStoredList(storage.get<SharedItem[] | string>(STORAGE_KEY)),
      );
    } catch {
      setPayload("none");
    }
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [refresh]);

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>Native Share example</Text>
      <Text testID="status-target-ready">{ready ? "ready" : "loading"}</Text>
      <TouchableOpacity
        testID="btn-seed-payload"
        style={styles.button}
        onPress={() => {
          storage.set(
            STORAGE_KEY,
            JSON.stringify([
              {
                type: "text",
                content: "seeded from host",
                timestamp: Date.now() / 1000,
              },
            ]),
          );
          refresh();
        }}
      >
        <Text style={styles.buttonText}>Seed payload</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-clear-payload"
        style={styles.button}
        onPress={() => {
          storage.remove(STORAGE_KEY);
          refresh();
        }}
      >
        <Text style={styles.buttonText}>Clear payload</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-open-share-sheet"
        style={styles.button}
        onPress={() => {
          void Share.share({
            message: UITEST_NATIVE_SHARE_MARKER,
            url: "https://example.com/expo-targets-share",
          });
        }}
      >
        <Text style={styles.buttonText}>Open Share Sheet</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-refresh"
        style={styles.button}
        onPress={refresh}
      >
        <Text style={styles.buttonText}>Refresh</Text>
      </TouchableOpacity>
      <Text testID="text-last-payload" style={styles.payload}>
        {payload}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700" },
  button: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  payload: { fontFamily: "Courier", fontSize: 12 },
});
