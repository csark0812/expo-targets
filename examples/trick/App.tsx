/**
 * ET Trick — showcase host for the deepened Apple extension targets:
 * notification-service, notification-content, photo-editing, file-provider.
 */
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

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

type Cap = {
  id: string;
  title: string;
  appex: string;
  how: string;
  surface: string;
};

const CAPS: Cap[] = [
  {
    id: "nse",
    title: "Notification Service",
    appex: "ET Trick NSE",
    how: "Remote / simctl push with mutable-content:1. NSE appends [expo-targets] to the title.",
    surface: "Lock Screen / NC · pluginkit usernotifications.service",
  },
  {
    id: "nce",
    title: "Notification Content",
    appex: "ET Trick NCE",
    how: "Push (or schedule) with category myNotificationCategory, then expand the notification.",
    surface: "Expanded notification · ET Trick NCE marker",
  },
  {
    id: "photo",
    title: "Photo Editing",
    appex: "ET Trick Photo",
    how: "Open Photos → pick an image → Edit. Extension applies grayscale via PHContentEditingController.",
    surface: "Photos Edit · pluginkit com.apple.photo-editing",
  },
  {
    id: "files",
    title: "File Provider",
    appex: "ET Trick Files",
    how: "Non-UI File Provider appex registered with the OS (domain UI needs host NSFileProviderManager.add).",
    surface: "pluginkit fileprovider-nonui · Files Browse best-effort",
  },
];

export default function App() {
  const [ready, setReady] = useState(false);
  const [perm, setPerm] = useState("pending");
  const [lastLocal, setLastLocal] = useState("none");

  const boot = useCallback(async () => {
    try {
      await Notifications.setNotificationCategoryAsync(NCE_CATEGORY, []);
      const current = await Notifications.getPermissionsAsync();
      let status = current.status;
      if (status !== "granted") {
        const asked = await Notifications.requestPermissionsAsync();
        status = asked.status;
      }
      setPerm(status);
    } catch (e) {
      setPerm(`error:${String(e)}`);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void boot();
  }, [boot]);

  const scheduleNce = async () => {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "ET Trick",
        body: "Expand me for rich NCE content",
        categoryIdentifier: NCE_CATEGORY,
      },
      trigger: null,
    });
    setLastLocal(id);
  };

  return (
    <View style={styles.root} testID="screen-root">
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.brand}>ET Trick</Text>
        <Text style={styles.tagline}>
          Four Apple extension tricks in one host — NSE, NCE, Photos Edit,
          Files.
        </Text>
        <Text testID="status-target-ready" style={styles.ready}>
          {ready ? "ready" : "booting"}
        </Text>
        <Text testID="text-notif-perm" style={styles.meta}>
          notifications: {perm}
        </Text>
        <Text testID="text-bundle-suffix" style={styles.meta}>
          com.expotargets.example.trick
        </Text>

        <Pressable
          testID="btn-schedule-nce"
          style={styles.cta}
          onPress={() => void scheduleNce()}
        >
          <Text style={styles.ctaText}>Schedule NCE notification</Text>
        </Pressable>
        <Text testID="text-last-local" style={styles.meta}>
          last local id: {lastLocal}
        </Text>

        {CAPS.map((cap) => (
          <View key={cap.id} style={styles.card} testID={`cap-${cap.id}`}>
            <Text style={styles.cardTitle}>{cap.title}</Text>
            <Text style={styles.appex}>{cap.appex}</Text>
            <Text style={styles.body}>{cap.how}</Text>
            <Text style={styles.surface}>{cap.surface}</Text>
          </View>
        ))}

        <Text style={styles.footer}>
          Prove on device: Settings → Apps → ET Trick · push / Photos Edit /
          pluginkit.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B1220" },
  scroll: { padding: 24, paddingTop: 64, paddingBottom: 48, gap: 14 },
  brand: {
    fontSize: 36,
    fontWeight: "800",
    color: "#F4F7FB",
    letterSpacing: -0.5,
  },
  tagline: { fontSize: 15, lineHeight: 22, color: "#9AA8BC" },
  ready: { color: "#5CFFB0", fontWeight: "700", marginTop: 4 },
  meta: { color: "#6B7C93", fontSize: 12, fontFamily: "Courier" },
  cta: {
    marginTop: 8,
    backgroundColor: "#2F6BFF",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  card: {
    marginTop: 4,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#141E2E",
    borderWidth: 1,
    borderColor: "#243247",
    gap: 6,
  },
  cardTitle: { color: "#F4F7FB", fontSize: 17, fontWeight: "700" },
  appex: { color: "#7EB6FF", fontSize: 13, fontWeight: "600" },
  body: { color: "#C5D0DF", fontSize: 13, lineHeight: 19 },
  surface: { color: "#6B7C93", fontSize: 11, marginTop: 4 },
  footer: { color: "#5A6A80", fontSize: 12, lineHeight: 18, marginTop: 8 },
});
