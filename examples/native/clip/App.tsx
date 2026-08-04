import { StatusBar } from 'expo-status-bar';
import { AppGroupStorage } from 'expo-targets';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const storage = new AppGroupStorage(
  'group.com.expotargets.example.native.clip'
);

export const CLIP_BUNDLE_ID = 'com.expotargets.example.native.clip.clip';

type HostButtonProps = {
  testID: string;
  label: string;
  onPress: () => void;
};

function HostButton({ testID, label, onPress }: HostButtonProps) {
  return (
    <TouchableOpacity testID={testID} style={styles.button} onPress={onPress}>
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

function readClipPayload(): string {
  const itemName = storage.get<string>('native-clip:lastItemName');
  const price = storage.get<string>('native-clip:lastPrice');
  const timestamp = storage.get<number>('native-clip:checkoutTimestamp');
  const invoked = storage.get<boolean>('native-clip:invoked');
  const invocationPath = storage.get<string>('native-clip:invocationPath');
  if (itemName || price || timestamp) {
    return JSON.stringify({
      itemName,
      price,
      timestamp,
      invoked,
      invocationPath,
    });
  }
  return 'none';
}

function seedClipPayload(refresh: () => void) {
  storage.set('native-clip:lastItemName', 'seeded item');
  storage.set('native-clip:lastPrice', '$19.99');
  storage.set('native-clip:checkoutTimestamp', Math.floor(Date.now() / 1000));
  refresh();
}

function clearClipPayload(refresh: () => void) {
  storage.remove('native-clip:lastItemName');
  storage.remove('native-clip:lastPrice');
  storage.remove('native-clip:checkoutTimestamp');
  storage.remove('native-clip:invoked');
  storage.remove('native-clip:invocationPath');
  refresh();
}

function useClipHost() {
  const [payload, setPayload] = useState('none');
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setPayload(readClipPayload());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { payload, ready, refresh };
}

type ClipHostViewProps = {
  payload: string;
  ready: boolean;
  refresh: () => void;
};

function ClipHostView({ payload, ready, refresh }: ClipHostViewProps) {
  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>Native Clip example</Text>
      <Text testID="status-target-ready">{ready ? 'ready' : 'loading'}</Text>
      <Text testID="text-clip-bundle">{CLIP_BUNDLE_ID}</Text>
      <Text testID="text-invocation-path">
        invocation:launchApp({CLIP_BUNDLE_ID})
      </Text>
      <HostButton
        testID="btn-seed-payload"
        label="Seed payload"
        onPress={() => seedClipPayload(refresh)}
      />
      <HostButton
        testID="btn-clear-payload"
        label="Clear payload"
        onPress={() => clearClipPayload(refresh)}
      />
      <HostButton testID="btn-refresh" label="Refresh" onPress={refresh} />
      <Text testID="text-last-payload" style={styles.payload}>
        {payload}
      </Text>
    </View>
  );
}

export default function App() {
  const host = useClipHost();
  return <ClipHostView {...host} />;
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
