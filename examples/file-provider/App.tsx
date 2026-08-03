import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  registerFileDomain,
  unregisterFileDomain,
} from "./modules/file-provider-domain";

export default function App() {
  const [ready, setReady] = useState(false);
  const [domain, setDomain] = useState("not-registered");

  const boot = useCallback(async () => {
    try {
      const name = await registerFileDomain();
      setDomain(`registered:${name}`);
    } catch (e) {
      setDomain(`error:${String(e)}`);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void boot();
  }, [boot]);

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>ET FileProv</Text>
      <Text testID="status-target-ready">{ready ? "ready" : "booting"}</Text>
      <Text testID="text-extension-type">file-provider</Text>
      <Text testID="text-files-domain" accessibilityLabel={`files-domain:${domain}`}>
        files-domain:{domain}
      </Text>
      <Pressable
        testID="btn-register-domain"
        accessibilityLabel="Register domain"
        style={styles.button}
        onPress={() => {
          void registerFileDomain()
            .then((name) => setDomain(`registered:${name}`))
            .catch((e) => setDomain(`error:${String(e)}`));
        }}
      >
        <Text style={styles.buttonText}>Register domain</Text>
      </Pressable>
      <Pressable
        testID="btn-unregister-domain"
        accessibilityLabel="Unregister domain"
        style={styles.buttonSecondary}
        onPress={() => {
          void unregisterFileDomain()
            .then(() => setDomain("not-registered"))
            .catch((e) => setDomain(`error:${String(e)}`));
        }}
      >
        <Text style={styles.buttonText}>Unregister domain</Text>
      </Pressable>
      <Text testID="btn-clear-payload">clear</Text>
      <Text testID="text-last-payload">none</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 12 },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonSecondary: {
    backgroundColor: "#5856D6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
