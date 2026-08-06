import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { AndroidNotification } from 'expo-targets';
import { useEffect, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const NCE_CATEGORY = 'myNotificationCategory';
const APP_GROUP = 'group.com.expotargets.example.notification-content';

async function requestNotificationPermission(): Promise<string> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') {
    return current.status;
  }
  const asked = await Notifications.requestPermissionsAsync();
  return asked.status;
}

async function bootstrapNceHost(): Promise<string> {
  await Notifications.setNotificationCategoryAsync(NCE_CATEGORY, []);
  return requestNotificationPermission();
}

function useNceBootstrap() {
  const [ready, setReady] = useState(false);
  const [perm, setPerm] = useState('pending');
  const [lastTitle, setLastTitle] = useState('none');

  useEffect(() => {
    let cancelled = false;
    void bootstrapNceHost()
      .then((status) => {
        if (!cancelled) {
          setPerm(status);
          setReady(true);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setPerm(`error:${String(e)}`);
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, perm, lastTitle, setLastTitle };
}

type NceHostViewProps = {
  ready: boolean;
  perm: string;
  bundleSuffix: string;
  lastTitle: string;
  onAndroidLocal: () => void;
};

function NceHostView({
  ready,
  perm,
  bundleSuffix,
  lastTitle,
  onAndroidLocal,
}: NceHostViewProps) {
  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>ET NCE</Text>
      <Text testID="status-target-ready">{ready ? 'ready' : 'booting'}</Text>
      <Text testID="text-extension-type">notification-content</Text>
      <Text testID="text-bundle-suffix">{bundleSuffix}</Text>
      <Text testID="text-notif-perm">{perm}</Text>
      {Platform.OS === 'android' ? (
        <TouchableOpacity
          testID="btn-android-rich-notif"
          style={styles.button}
          onPress={onAndroidLocal}
        >
          <Text style={styles.buttonText}>Android rich content</Text>
        </TouchableOpacity>
      ) : null}
      <Text testID="btn-clear-payload">clear</Text>
      <Text testID="text-last-payload">{lastTitle}</Text>
    </View>
  );
}

export default function App() {
  const host = useNceBootstrap();
  return (
    <NceHostView
      ready={host.ready}
      perm={host.perm}
      bundleSuffix="com.expotargets.example.notification-content"
      lastTitle={host.lastTitle}
      onAndroidLocal={() => {
        void (async () => {
          const title = `rich-${Date.now()}`;
          await AndroidNotification.presentContent({
            title,
            body: 'RemoteViews content',
            targetName: 'NotificationContent',
          });
          const stored =
            (await AndroidNotification.getLastProcessedTitle(APP_GROUP)) ??
            title;
          host.setLastTitle(stored);
        })();
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
