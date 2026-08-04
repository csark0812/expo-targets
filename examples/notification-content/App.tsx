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

const NCE_CATEGORY = 'myNotificationCategory';

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

  return { ready, perm };
}

type NceHostViewProps = {
  ready: boolean;
  perm: string;
  bundleSuffix: string;
};

function NceHostView({ ready, perm, bundleSuffix }: NceHostViewProps) {
  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>ET NCE</Text>
      <Text testID="status-target-ready">{ready ? 'ready' : 'booting'}</Text>
      <Text testID="text-extension-type">notification-content</Text>
      <Text testID="text-bundle-suffix">{bundleSuffix}</Text>
      <Text testID="text-notif-perm">{perm}</Text>
      <Text testID="btn-clear-payload">clear</Text>
      <Text testID="text-last-payload">none</Text>
    </View>
  );
}

export default function App() {
  const { ready, perm } = useNceBootstrap();
  return (
    <NceHostView
      ready={ready}
      perm={perm}
      bundleSuffix="com.expotargets.example.notification-content"
    />
  );
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
