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

export default function App() {
  const [ready, setReady] = useState(false);
  const [perm, setPerm] = useState('pending');
  const [pushToken, setPushToken] = useState('pending');

  useEffect(() => {
    let cancelled = false;
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: host bootstrap IIFE
    (async () => {
      try {
        const current = await Notifications.getPermissionsAsync();
        let status = current.status;
        if (status !== 'granted') {
          const asked = await Notifications.requestPermissionsAsync();
          status = asked.status;
        }
        let tokenLabel = 'none';
        if (status === 'granted') {
          try {
            const device = await Notifications.getDevicePushTokenAsync();
            tokenLabel = typeof device.data === 'string' ? device.data : String(device.data);
          } catch (tokenErr) {
            tokenLabel = `error:${String(tokenErr)}`;
          }
        }
        if (!cancelled) {
          setPerm(status);
          setPushToken(tokenLabel);
          setReady(true);
        }
      } catch (e) {
        if (!cancelled) {
          setPerm(`error:${String(e)}`);
          setPushToken('error');
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
});
