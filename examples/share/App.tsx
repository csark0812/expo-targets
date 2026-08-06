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
import { shareTarget } from './targets/share';

/** Marker string asserted by ShareSheetSmoke after text Save. */
export const UITEST_SHARE_MARKER = 'expo-targets uitest share payload';

/** Host payload substring for the image / multi-item deepening path. */
export const UITEST_SHARE_IMAGE_KIND = '"kind":"image"';

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
    message: UITEST_SHARE_MARKER,
    url: 'https://example.com/expo-targets-share',
  });
}

function openImageShareSheetSafe() {
  void openImageShareSheet().catch((error) => {
    console.warn('[ETShare] image Share.share failed', error);
  });
}

function seedSharePayload(refresh: () => void) {
  shareTarget.setData({
    items: [
      {
        id: 'seed',
        sharedAt: new Date().toISOString(),
        kind: 'text',
        content: { text: 'seeded from host' },
      },
    ],
  });
  refresh();
}

function clearSharePayload(refresh: () => void) {
  shareTarget.setData({ items: [] });
  refresh();
}

function formatSharePayload(data: { items?: unknown[] } | null | undefined) {
  return data?.items?.length ? JSON.stringify(data.items) : 'none';
}

function useShareHost() {
  const [payload, setPayload] = useState('none');
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    const data = shareTarget.getData<{ items: unknown[] }>();
    setPayload(formatSharePayload(data));
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

type ShareHostViewProps = {
  payload: string;
  ready: boolean;
  refresh: () => void;
};

function ShareHostView({ payload, ready, refresh }: ShareHostViewProps) {
  const android = Platform.OS === 'android';

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>Share example</Text>
      <Text style={styles.subtitle}>This screen = the main app (host)</Text>
      <Text testID="status-target-ready">{ready ? 'ready' : 'loading'}</Text>

      <Text testID="text-platform-note" style={styles.hint}>
        {android
          ? [
              'How Android share works in expo-targets:',
              '',
              '1. Photos / Files / another app → system Share sheet',
              '2. Pick “Example Share” → a SEPARATE Share Activity dialog',
              '   (not this main app)',
              '3. In that dialog:',
              '   • Save — store shared item, close dialog',
              '   • Open main app — launch THIS screen on purpose',
              '   • Cancel — dismiss without saving',
              '',
              'Buttons below only demo the sheet FROM the host.',
              'Real users usually share INTO the app from elsewhere.',
            ].join('\n')
          : 'iOS: system share sheet → Share extension (RN). Host reads App Group payload below.'}
      </Text>

      <HostButton
        testID="btn-seed-payload"
        label="Seed payload"
        onPress={() => seedSharePayload(refresh)}
      />
      <HostButton
        testID="btn-clear-payload"
        label="Clear payload"
        onPress={() => clearSharePayload(refresh)}
      />
      <HostButton
        testID="btn-open-share-sheet"
        label={android ? 'Demo: share text → sheet' : 'Open Share Sheet'}
        onPress={openTextShareSheet}
      />
      <HostButton
        testID="btn-open-image-share"
        label={android ? 'Demo: share image → sheet' : 'Open Image Share'}
        onPress={openImageShareSheetSafe}
      />
      <HostButton testID="btn-refresh" label="Refresh payload" onPress={refresh} />

      <Text style={styles.payloadLabel}>Last saved share (from Share Activity):</Text>
      <Text testID="text-last-payload" style={styles.payload}>
        {payload}
      </Text>
    </View>
  );
}

export default function App() {
  const host = useShareHost();
  return <ShareHostView {...host} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 10, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 14, fontWeight: '600', color: '#111' },
  hint: { color: '#444', fontSize: 12, lineHeight: 18 },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  payloadLabel: { marginTop: 4, fontSize: 12, fontWeight: '600', color: '#333' },
  payload: { fontFamily: 'Courier', fontSize: 11 },
});
