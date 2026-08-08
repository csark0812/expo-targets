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

const storage = new AppGroupStorage('group.com.expotargets.example.app-intent');

async function openAppActionsSettings() {
  if (Platform.OS === 'android') {
    try {
      await Linking.sendIntent('android.settings.VOICE_INPUT_SETTINGS');
      return;
    } catch {
      // fall through
    }
  }
  await Linking.openSettings();
}

function seedShortcut(setPayload: (v: string) => void) {
  storage.set('ai:marker', 'ET Greet');
  setPayload(JSON.stringify({ marker: 'ET Greet', seeded: true }));
}

function clearAiPayload(setPayload: (v: string) => void) {
  storage.remove('ai:marker');
  storage.remove('ai:result');
  storage.remove('ai:lastAt');
  setPayload('none');
}

function AppIntentActions({
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
        <>
          <TouchableOpacity
            testID="btn-seed-shortcut"
            accessibilityLabel="Seed shortcut"
            style={styles.button}
            onPress={() => seedShortcut(setPayload)}
          >
            <Text style={styles.buttonText}>Seed shortcut</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="btn-open-app-actions"
            accessibilityLabel="Open App Actions"
            style={styles.button}
            onPress={() => {
              void openAppActionsSettings();
            }}
          >
            <Text style={styles.buttonText}>Open App Actions</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text accessibilityLabel="ai-shortcuts-hint">
          Shortcuts → ET Greet run writes App Group
        </Text>
      )}
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
        accessibilityLabel="Clear"
        style={styles.button}
        onPress={() => clearAiPayload(setPayload)}
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
    const marker = storage.get<string>('ai:marker');
    const result = storage.get<string>('ai:result');
    if (marker || result) {
      setPayload(JSON.stringify({ marker, result }));
    } else {
      setPayload('none');
    }
  }, []);

  useEffect(() => {
    refresh();
    setReady(true);
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>ET AppIntent</Text>
      <Text testID="status-target-ready">{ready ? 'ready' : 'loading'}</Text>
      <Text testID="text-extension-type">app-intent</Text>
      <Text testID="text-bundle-suffix">
        com.expotargets.example.app-intent
      </Text>
      <Text style={styles.hint} testID="text-platform-note">
        {Platform.OS === 'android'
          ? 'Android: App Actions/shortcuts list should show ET Greet.'
          : 'Shortcuts → ET Greet run writes App Group'}
      </Text>
      <AppIntentActions
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
