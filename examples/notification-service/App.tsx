import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [ready, setReady] = useState(false);
  const [perm, setPerm] = useState("pending");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const current = await Notifications.getPermissionsAsync();
        let status = current.status;
        if (status !== "granted") {
          const asked = await Notifications.requestPermissionsAsync();
          status = asked.status;
        }
        if (!cancelled) {
          setPerm(status);
          setReady(true);
        }
      } catch (e) {
        if (!cancelled) {
          setPerm(`error:${String(e)}`);
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>ET NSE</Text>
      <Text testID="status-target-ready">{ready ? "ready" : "booting"}</Text>
      <Text testID="text-extension-type">notification-service</Text>
      <Text testID="text-bundle-suffix">
        com.expotargets.example.notification-service
      </Text>
      <Text testID="text-notif-perm">{perm}</Text>
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
  },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 12 },
});
