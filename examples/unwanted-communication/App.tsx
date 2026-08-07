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
  'group.com.expotargets.example.unwanted-communication'
);

async function openScreeningSettings() {
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

function clearUcPayload(setPayload: (v: string) => void) {
  storage.remove('uc:marker');
  storage.remove('uc:lastRequest');
  storage.remove('uc:lastAt');
  setPayload('none');
}

function UnwantedActions({
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
          testID="btn-open-screening-settings"
          accessibilityLabel="Open screening settings"
          style={styles.button}
          onPress={() => {
            void openScreeningSettings().then(() =>
              setPayload('opened-settings')
            );
          }}
        >
          <Text style={styles.buttonText}>Open screening settings</Text>
        </TouchableOpacity>
      ) : (
        <Text accessibilityLabel="uc-settings-hint">
          Settings Phone → SMS/Call Reporting lists ET Unwanted Target
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
        accessibilityLabel="Clear payload"
        style={styles.button}
        onPress={() => clearUcPayload(setPayload)}
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
    const marker = storage.get<string>('uc:marker');
    const request = storage.get<string>('uc:lastRequest');
    if (marker || request) {
      setPayload(JSON.stringify({ marker, request }));
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
      <Text style={styles.title}>ET Unwanted</Text>
      <Text testID="status-target-ready">{ready ? 'ready' : 'loading'}</Text>
      <Text testID="text-extension-type">unwanted-communication</Text>
      <Text testID="text-bundle-suffix">
        com.expotargets.example.unwanted-communication
      </Text>
      <Text style={styles.hint} testID="text-platform-note">
        {Platform.OS === 'android'
          ? 'Android: Reporting/screening extras should list ET Unwanted (Play/OEM may leftover).'
          : 'Settings Phone → SMS/Call Reporting lists ET Unwanted Target'}
      </Text>
      <UnwantedActions
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
