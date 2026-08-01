import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { shareTarget } from './targets/share';

/** Marker string asserted by ShareSheetSmoke after Save. */
export const UITEST_SHARE_MARKER = 'expo-targets uitest share payload';

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: host contract demo screen
export default function App() {
  const [payload, setPayload] = useState('none');
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    const data = shareTarget.getData<{ items: unknown[] }>();
    setPayload(data?.items?.length ? JSON.stringify(data.items) : 'none');
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>Share example</Text>
      <Text testID="status-target-ready">{ready ? 'ready' : 'loading'}</Text>
      <TouchableOpacity
        testID="btn-seed-payload"
        style={styles.button}
        onPress={() => {
          shareTarget.setData({
            items: [
              {
                id: 'seed',
                sharedAt: new Date().toISOString(),
                content: { text: 'seeded from host' },
              },
            ],
          });
          refresh();
        }}
      >
        <Text style={styles.buttonText}>Seed payload</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-clear-payload"
        style={styles.button}
        onPress={() => {
          shareTarget.setData({ items: [] });
          refresh();
        }}
      >
        <Text style={styles.buttonText}>Clear payload</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-open-share-sheet"
        style={styles.button}
        onPress={() => {
          void Share.share({
            message: UITEST_SHARE_MARKER,
            url: 'https://example.com/expo-targets-share',
          });
        }}
      >
        <Text style={styles.buttonText}>Open Share Sheet</Text>
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
