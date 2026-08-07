import { Asset } from 'expo-asset';
import { StatusBar } from 'expo-status-bar';
import { AppGroupStorage } from 'expo-targets';
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

const APP_GROUP = 'group.com.expotargets.example.native.action';
/** Matches expo-target.config.json `name` / Android TARGET_NAME meta. */
const ANDROID_TARGET_NAME = 'NativeAction';
const IOS_STORAGE_KEY = 'nativeAction:items';

const storage =
  Platform.OS === 'android'
    ? new AppGroupStorage(APP_GROUP, ANDROID_TARGET_NAME)
    : new AppGroupStorage(APP_GROUP);

function storageKey(): string {
  return Platform.OS === 'android' ? 'items' : IOS_STORAGE_KEY;
}

/** Default segment title written by Process Image (iOS) / shared text marker (Android). */
export const UITEST_NATIVE_ACTION_MARKER = 'Original';

type ProcessedItem = {
  filter: string;
  timestamp: number;
  kind?: string;
  imageCount?: number;
  multiItem?: boolean;
  returnedItems?: boolean;
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

/** Android Locked P — text SEND into Native Action Activity; marker in content.text. */
function openTextShareSheet() {
  void Share.share({
    message: UITEST_NATIVE_ACTION_MARKER,
  });
}

function openImageShareSheetSafe() {
  void openImageShareSheet().catch((error) => {
    console.warn('[ETNAction] Share.share failed', error);
  });
}

function formatStoredList(
  raw: ProcessedItem[] | string | null | undefined
): string {
  if (!raw) return 'none';
  const items =
    typeof raw === 'string' ? (JSON.parse(raw) as ProcessedItem[]) : raw;
  return items.length ? JSON.stringify(items) : 'none';
}

function seedNativeActionPayload(refresh: () => void) {
  storage.set(
    storageKey(),
    JSON.stringify([
      {
        filter: 'grayscale',
        timestamp: Date.now() / 1000,
        kind: 'image',
        imageCount: 1,
        multiItem: false,
        returnedItems: false,
      },
    ])
  );
  refresh();
}

function clearNativeActionPayload(refresh: () => void) {
  storage.remove(storageKey());
  refresh();
}

function useNativeActionHost() {
  const [payload, setPayload] = useState('none');
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    try {
      setPayload(
        formatStoredList(storage.get<ProcessedItem[] | string>(storageKey()))
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

type NativeActionHostViewProps = {
  payload: string;
  ready: boolean;
  refresh: () => void;
};

function NativeActionHostView({
  payload,
  ready,
  refresh,
}: NativeActionHostViewProps) {
  const android = Platform.OS === 'android';
  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>Native Action example</Text>
      <Text testID="status-target-ready">{ready ? 'ready' : 'loading'}</Text>
      <Text testID="text-platform-note" style={styles.hint}>
        {android
          ? 'Android: share text → Native Action Activity → Save → host marker.'
          : 'iOS: share image → Action extension → Process Image.'}
      </Text>
      <HostButton
        testID="btn-seed-payload"
        label="Seed payload"
        onPress={() => seedNativeActionPayload(refresh)}
      />
      <HostButton
        testID="btn-clear-payload"
        label="Clear payload"
        onPress={() => clearNativeActionPayload(refresh)}
      />
      {android ? (
        <HostButton
          testID="btn-open-share-sheet"
          label="Share text (action)"
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
  const host = useNativeActionHost();
  return <NativeActionHostView {...host} />;
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
