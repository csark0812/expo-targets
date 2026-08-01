import { Asset } from 'expo-asset';
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
import { actionTarget } from './targets/action';

/** Share a local image file so the action extension's image activation rule matches. */
async function openImageShareSheet() {
  const [asset] = await Asset.loadAsync(require('./assets/icon.png'));
  let url = asset.localUri ?? asset.uri;
  if (!url) {
    throw new Error('icon.png asset has no localUri/uri');
  }
  // Release resolves can omit the scheme; UIActivityViewController needs a file URL.
  if (!url.includes('://')) {
    url = `file://${url}`;
  }
  await Share.share({ url });
}

/** Marker written by ActionExtension.save (`filter: 'grayscale'`). */
export const UITEST_ACTION_MARKER = 'grayscale';

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: host contract demo screen
export default function App() {
  const [payload, setPayload] = useState('none');
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    const data = actionTarget.getData<{ items: unknown[] }>();
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
      <Text style={styles.title}>Action example</Text>
      <Text testID="status-target-ready">{ready ? 'ready' : 'loading'}</Text>
      <TouchableOpacity
        testID="btn-seed-payload"
        style={styles.button}
        onPress={() => {
          actionTarget.setData({
            items: [
              {
                id: 'seed',
                processedAt: new Date().toISOString(),
                filter: 'seed',
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
          actionTarget.setData({ items: [] });
          refresh();
        }}
      >
        <Text style={styles.buttonText}>Clear payload</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-open-share-sheet"
        style={styles.button}
        onPress={() => {
          void openImageShareSheet().catch((error) => {
            console.warn('[ETAction] Share.share failed', error);
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
