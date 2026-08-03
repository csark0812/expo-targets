import { StatusBar } from 'expo-status-bar';
import { AppGroupStorage } from 'expo-targets';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const storage = new AppGroupStorage(
  'group.com.expotargets.example.native.clip'
);

export const CLIP_BUNDLE_ID = 'com.expotargets.example.native.clip.clip';

export default function App() {
  const [payload, setPayload] = useState('none');
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    const itemName = storage.get<string>('native-clip:lastItemName');
    const price = storage.get<string>('native-clip:lastPrice');
    const timestamp = storage.get<number>('native-clip:checkoutTimestamp');
    const invoked = storage.get<boolean>('native-clip:invoked');
    const invocationPath = storage.get<string>('native-clip:invocationPath');
    if (itemName || price || timestamp) {
      setPayload(
        JSON.stringify({ itemName, price, timestamp, invoked, invocationPath })
      );
    } else {
      setPayload('none');
    }
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>Native Clip example</Text>
      <Text testID="status-target-ready">{ready ? 'ready' : 'loading'}</Text>
      <Text testID="text-clip-bundle">{CLIP_BUNDLE_ID}</Text>
      <Text testID="text-invocation-path">
        invocation:launchApp({CLIP_BUNDLE_ID})
      </Text>
      <TouchableOpacity
        testID="btn-seed-payload"
        style={styles.button}
        onPress={() => {
          storage.set('native-clip:lastItemName', 'seeded item');
          storage.set('native-clip:lastPrice', '$19.99');
          storage.set(
            'native-clip:checkoutTimestamp',
            Math.floor(Date.now() / 1000)
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
          storage.remove('native-clip:lastItemName');
          storage.remove('native-clip:lastPrice');
          storage.remove('native-clip:checkoutTimestamp');
          storage.remove('native-clip:invoked');
          storage.remove('native-clip:invocationPath');
          refresh();
        }}
      >
        <Text style={styles.buttonText}>Clear payload</Text>
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
  container: { flex: 1, padding: 24, gap: 12, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  payload: { fontFamily: 'Courier', fontSize: 12 },
});
