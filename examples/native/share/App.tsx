import { Asset } from 'expo-asset';
import { StatusBar } from 'expo-status-bar';
import { AppGroupStorage } from 'expo-targets';
import { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const storage = new AppGroupStorage(
  'group.com.expotargets.example.native.share'
);
const STORAGE_KEY = 'nativeShare:items';

/** Marker string asserted by ShareSheetSmoke after Save to App. */
export const UITEST_NATIVE_SHARE_MARKER = 'expo-targets uitest share payload';

/** Image-path marker written when Save stores an image UTType item. */
export const UITEST_NATIVE_SHARE_IMAGE_TYPE = '"type":"image"';

type SharedItem = {
  type: string;
  content: string;
  timestamp: number;
  itemCount?: number;
};

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

function openTextShareSheet() {
  void Share.share({
    message: UITEST_NATIVE_SHARE_MARKER,
    url: 'https://example.com/expo-targets-share',
  });
}

function openImageShareSheetSafe() {
  void openImageShareSheet().catch((error) => {
    console.warn('[ETNShare] image Share.share failed', error);
  });
}

function formatStoredList(
  raw: SharedItem[] | string | null | undefined
): string {
  if (!raw) return 'none';
  const items =
    typeof raw === 'string' ? (JSON.parse(raw) as SharedItem[]) : raw;
  return items.length ? JSON.stringify(items) : 'none';
}

function seedNativeSharePayload(refresh: () => void) {
  storage.set(
    STORAGE_KEY,
    JSON.stringify([
      {
        type: 'text',
        content: 'seeded from host',
        timestamp: Date.now() / 1000,
        itemCount: 1,
      },
    ])
  );
  refresh();
}

function clearNativeSharePayload(refresh: () => void) {
  storage.remove(STORAGE_KEY);
  refresh();
}

function useNativeShareHost() {
  const [payload, setPayload] = useState('none');
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    try {
      setPayload(
        formatStoredList(storage.get<SharedItem[] | string>(STORAGE_KEY))
      );
    } catch {
      setPayload('none');
    }
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [refresh]);

  return { payload, ready, refresh };
}

type NativeShareHostViewProps = {
  payload: string;
  ready: boolean;
  refresh: () => void;
};

function NativeShareHostView({
  payload,
  ready,
  refresh,
}: NativeShareHostViewProps) {
  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>Native Share example</Text>
      <Text testID="status-target-ready">{ready ? 'ready' : 'loading'}</Text>
      <HostButton
        testID="btn-seed-payload"
        label="Seed payload"
        onPress={() => seedNativeSharePayload(refresh)}
      />
      <HostButton
        testID="btn-clear-payload"
        label="Clear payload"
        onPress={() => clearNativeSharePayload(refresh)}
      />
      <HostButton
        testID="btn-open-share-sheet"
        label="Open Share Sheet"
        onPress={openTextShareSheet}
      />
      <HostButton
        testID="btn-open-image-share"
        label="Open Image Share"
        onPress={openImageShareSheetSafe}
      />
      <HostButton testID="btn-refresh" label="Refresh" onPress={refresh} />
      <Text testID="text-last-payload" style={styles.payload}>
        {payload}
      </Text>
    </View>
  );
}

export default function App() {
  const host = useNativeShareHost();
  return <NativeShareHostView {...host} />;
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
