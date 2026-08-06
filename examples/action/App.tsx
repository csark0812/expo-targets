import { Asset } from 'expo-asset';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { actionTarget } from './targets/action';

/** Share a local image file so the iOS action extension's image rule matches. */
async function openImageShareSheet() {
  const [asset] = await Asset.loadAsync(require('./assets/icon.png'));
  let url = asset.localUri ?? asset.uri;
  if (!url) {
    throw new Error('icon.png asset has no localUri/uri');
  }
  if (!url.includes('://')) {
    url = `file://${url}`;
  }
  await Share.share({ url });
}

/** Android PROCESS_TEXT path — share plain text into the system sheet. */
function openTextShareSheet() {
  void Share.share({
    message: 'expo-targets action process-text sample',
  });
}

/** Marker written by ActionExtension.save (`filter: 'grayscale'`). */
export const UITEST_ACTION_MARKER = 'grayscale';

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

function openImageShareSheetSafe() {
  void openImageShareSheet().catch((error) => {
    console.warn('[ETAction] Share.share failed', error);
  });
}

function seedActionPayload(refresh: () => void) {
  actionTarget.setData({
    items: [
      {
        id: 'seed',
        processedAt: new Date().toISOString(),
        filter: 'seed',
        kind: 'image',
        imageCount: 0,
        multiItem: false,
      },
    ],
  });
  refresh();
}

function clearActionPayload(refresh: () => void) {
  actionTarget.setData({ items: [] });
  refresh();
}

function formatActionPayload(data: { items?: unknown[] } | null | undefined) {
  return data?.items?.length ? JSON.stringify(data.items) : 'none';
}

function useActionHost() {
  const [payload, setPayload] = useState('none');
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    const data = actionTarget.getData<{ items: unknown[] }>();
    setPayload(formatActionPayload(data));
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return { payload, ready, refresh };
}

type ActionHostViewProps = {
  payload: string;
  ready: boolean;
  refresh: () => void;
};

function ActionHostView({ payload, ready, refresh }: ActionHostViewProps) {
  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>Action example</Text>
      <Text testID="status-target-ready">{ready ? 'ready' : 'loading'}</Text>
      <Text testID="text-platform-note" style={styles.hint}>
        {Platform.OS === 'android'
          ? 'Android: share text → Process text → Example Action (native Activity).'
          : 'iOS: share image → Action extension (RN entry).'}
      </Text>
      <HostButton
        testID="btn-seed-payload"
        label="Seed payload"
        onPress={() => seedActionPayload(refresh)}
      />
      <HostButton
        testID="btn-clear-payload"
        label="Clear payload"
        onPress={() => clearActionPayload(refresh)}
      />
      {Platform.OS === 'android' ? (
        <HostButton
          testID="btn-open-share-sheet"
          label="Share text (PROCESS_TEXT)"
          onPress={openTextShareSheet}
        />
      ) : (
        <HostButton
          testID="btn-open-share-sheet"
          label="Open Share Sheet"
          onPress={openImageShareSheetSafe}
        />
      )}
      <HostButton testID="btn-refresh" label="Refresh" onPress={refresh} />
      <Text testID="text-last-payload" style={styles.payload}>
        {payload}
      </Text>
    </View>
  );
}

export default function App() {
  const host = useActionHost();
  return <ActionHostView {...host} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  hint: { color: '#666', fontSize: 13 },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  payload: { fontFamily: 'Courier', fontSize: 12 },
});
