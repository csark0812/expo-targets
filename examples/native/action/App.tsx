import { Asset } from "expo-asset";
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
  "group.com.expotargets.example.native.action",
);
const STORAGE_KEY = "nativeAction:items";

/** Default segment title written by Process Image. */
export const UITEST_NATIVE_ACTION_MARKER = "Original";

async function openImageShareSheet() {
  const [asset] = await Asset.loadAsync(require("./assets/icon.png"));
  let url = asset.localUri ?? asset.uri;
  if (!url) {
    throw new Error("icon.png asset has no localUri/uri");
  }
  if (!url.includes("://")) {
    url = `file://${url}`;
  }
  await Share.share({ url });
}

type ProcessedItem = { filter: string; timestamp: number };

function formatStoredList(
  raw: ProcessedItem[] | string | null | undefined,
): string {
  if (!raw) return "none";
  const items =
    typeof raw === "string" ? (JSON.parse(raw) as ProcessedItem[]) : raw;
  return items.length ? JSON.stringify(items) : "none";
}

export default function App() {
  const [payload, setPayload] = useState("none");
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    try {
      setPayload(
        formatStoredList(storage.get<ProcessedItem[] | string>(STORAGE_KEY)),
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
      <Text style={styles.title}>Native Action example</Text>
      <Text testID="status-target-ready">{ready ? "ready" : "loading"}</Text>
      <TouchableOpacity
        testID="btn-seed-payload"
        style={styles.button}
        onPress={() => {
          storage.set(
            STORAGE_KEY,
            JSON.stringify([
              { filter: "grayscale", timestamp: Date.now() / 1000 },
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
          void openImageShareSheet().catch((error) => {
            console.warn("[ETNAction] Share.share failed", error);
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
