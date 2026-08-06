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

const APP_GROUP = 'group.com.expotargets.example.notification-service';

async function requestNotificationPermission(): Promise<string> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') {
    return current.status;
  }
  const asked = await Notifications.requestPermissionsAsync();
  return asked.status;
}

async function fetchDevicePushToken(): Promise<string> {
  try {
    const device = await Notifications.getDevicePushTokenAsync();
    return typeof device.data === 'string' ? device.data : String(device.data);
  } catch (tokenErr) {
    return `error:${String(tokenErr)}`;
  }
}

async function bootstrapNseHost(): Promise<{
  perm: string;
  pushToken: string;
}> {
  const perm = await requestNotificationPermission();
  const pushToken = perm === 'granted' ? await fetchDevicePushToken() : 'none';
  return { perm, pushToken };
}

function useNseBootstrap() {
  const [ready, setReady] = useState(false);
  const [perm, setPerm] = useState('pending');
  const [pushToken, setPushToken] = useState('pending');
  const [lastTitle, setLastTitle] = useState('none');

  useEffect(() => {
    let cancelled = false;
    void bootstrapNseHost()
      .then(({ perm: status, pushToken: token }) => {
        if (!cancelled) {
          setPerm(status);
          setPushToken(token);
          setReady(true);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setPerm(`error:${String(e)}`);
          setPushToken('error');
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, perm, pushToken, lastTitle, setLastTitle };
}

type NseHostViewProps = {
  ready: boolean;
  perm: string;
  pushToken: string;
  lastTitle: string;
  onAndroidLocal: () => void;
};

function NseHostView({
  ready,
  perm,
  pushToken,
  lastTitle,
  onAndroidLocal,
}: NseHostViewProps) {
  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>ET NSE</Text>
      <Text testID="status-target-ready">{ready ? 'ready' : 'booting'}</Text>
      <Text testID="text-extension-type">notification-service</Text>
      <Text testID="text-bundle-suffix">
        com.expotargets.example.notification-service
      </Text>
      <Text testID="text-notif-perm">{perm}</Text>
      {/* Devicewright scrapes this AX label for the APNs Sandbox device token. */}
      <Text testID="text-device-push-token" selectable>
        {pushToken}
      </Text>
      {Platform.OS === 'android' ? (
        <TouchableOpacity
          testID="btn-android-local-notif"
          style={styles.button}
          onPress={onAndroidLocal}
        >
          <Text style={styles.buttonText}>Android local process</Text>
        </TouchableOpacity>
      ) : null}
      <Text testID="btn-clear-payload">clear</Text>
      <Text testID="text-last-payload">{lastTitle}</Text>
    </View>
  );
}

export default function App() {
  const host = useNseBootstrap();

  return (
    <NseHostView
      ready={host.ready}
      perm={host.perm}
      pushToken={host.pushToken}
      lastTitle={host.lastTitle}
      onAndroidLocal={() => {
        void (async () => {
          const mutated = await AndroidNotification.processAndPresent({
            title: `host-${Date.now()}`,
            body: 'local NSE path',
            targetName: 'NotificationService',
          });
          const stored =
            (await AndroidNotification.getLastProcessedTitle(APP_GROUP)) ??
            mutated;
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
