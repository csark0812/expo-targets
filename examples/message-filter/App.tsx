import { StatusBar } from 'expo-status-bar';
import { AppGroupStorage } from 'expo-targets';
import { useCallback, useEffect, useState } from 'react';
import {
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const storage = new AppGroupStorage(
  'group.com.expotargets.example.message-filter'
);

async function openFilterSettings() {
  if (Platform.OS === 'android') {
    try {
      await Linking.sendIntent('android.settings.MANAGE_DEFAULT_APPS_SETTINGS');
      return;
    } catch {
      // fall through
    }
  }
  await Linking.openSettings();
}

function clearMsgFilterPayload(setPayload: (v: string) => void) {
  storage.remove('msgFilter:lastAction');
  storage.remove('msgFilter:lastBody');
  storage.remove('msgFilter:lastSender');
  storage.remove('msgFilter:lastAt');
  setPayload('none');
}

function MessageFilterActions({
  payload,
  refresh,
  setPayload,
}: {
  payload: string;
  refresh: () => void;
  setPayload: (v: string) => void;
}) {
  return (
    <>
      {Platform.OS === 'android' ? (
        <TouchableOpacity
          testID="btn-open-filter-settings"
          accessibilityLabel="Open filter settings"
          style={styles.button}
          onPress={() => {
            void openFilterSettings().then(() => setPayload('opened-settings'));
          }}
        >
          <Text style={styles.buttonText}>Open filter settings</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        testID="btn-refresh"
        accessibilityLabel="Refresh"
        style={styles.button}
        onPress={refresh}
      >
        <Text style={styles.buttonText}>Refresh</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-clear-payload"
        accessibilityLabel="Clear payload"
        style={styles.button}
        onPress={() => clearMsgFilterPayload(setPayload)}
      >
        <Text style={styles.buttonText}>Clear</Text>
      </TouchableOpacity>
      <Text testID="text-last-payload" style={styles.payload}>
        {payload}
      </Text>
    </>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [payload, setPayload] = useState('none');

  const refresh = useCallback(() => {
    const action = storage.get<string>('msgFilter:lastAction');
    const body = storage.get<string>('msgFilter:lastBody');
    const sender = storage.get<string>('msgFilter:lastSender');
    if (action || body || sender) {
      setPayload(JSON.stringify({ action, body, sender }));
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
      <Text style={styles.title}>ET MsgFilter</Text>
      <Text testID="status-target-ready">{ready ? 'ready' : 'loading'}</Text>
      <Text testID="text-extension-type">message-filter</Text>
      <Text testID="text-bundle-suffix">
        com.expotargets.example.message-filter
      </Text>
      <Text style={styles.hint} testID="text-platform-note">
        {Platform.OS === 'android'
          ? 'Android: Filter settings UI should list ET MsgFilter (OEM/AOSP may leftover).'
          : 'iOS: Messages Unknown Senders / Text Message Filter list.'}
      </Text>
      <MessageFilterActions
        payload={payload}
        refresh={refresh}
        setPayload={setPayload}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  hint: { color: '#666', fontSize: 13, textAlign: 'center' },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  payload: { marginTop: 8, textAlign: 'center' },
});
