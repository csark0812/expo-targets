/**
 * Shared host bootstrap for notification-service / notification-content examples.
 * Requests notification auth + registers NCE category when needed.
 */
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

const NCE_CATEGORY = "myNotificationCategory";

export type NotificationHostProps = {
  title: string;
  extensionType: string;
  bundleSuffix: string;
  /** Register UNNotificationCategory for content-extension rich UI. */
  registerContentCategory?: boolean;
};

export function NotificationHostApp({
  title,
  extensionType,
  bundleSuffix,
  registerContentCategory = false,
}: NotificationHostProps) {
  const [ready, setReady] = useState(false);
  const [perm, setPerm] = useState("pending");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (registerContentCategory) {
          await Notifications.setNotificationCategoryAsync(NCE_CATEGORY, []);
        }
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
  }, [registerContentCategory]);

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>{title}</Text>
      <Text testID="status-target-ready">{ready ? "ready" : "booting"}</Text>
      <Text testID="text-extension-type">{extensionType}</Text>
      <Text testID="text-bundle-suffix">{bundleSuffix}</Text>
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
