import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

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

  return { ready, perm, pushToken };
}

type NseHostViewProps = {
  ready: boolean;
  perm: string;
  pushToken: string;
};

function NseHostView({ ready, perm, pushToken }: NseHostViewProps) {
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
      <Text testID="btn-clear-payload">clear</Text>
      <Text testID="text-last-payload">none</Text>
    </View>
  );
}

export default function App() {
  const host = useNseBootstrap();
  return <NseHostView {...host} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
});
