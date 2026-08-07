import { StatusBar } from 'expo-status-bar';
import { AppGroupStorage } from 'expo-targets';
import { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const storage = new AppGroupStorage('group.com.expotargets.example.spotlight');

function seedAppSearch(setPayload: (v: string) => void) {
  // Index request only — real AppSearch hit must populate spotlight:marker.
  storage.set('spotlight:lastFile', 'et-import.appsearch');
  setPayload('appsearch:indexed');
}

function queryAppSearch(setPayload: (v: string) => void) {
  const marker = storage.get<string>('spotlight:marker');
  setPayload(
    marker ? JSON.stringify({ marker, query: 'hit' }) : 'appsearch:queried'
  );
}

function clearSpotlightPayload(setPayload: (v: string) => void) {
  storage.remove('spotlight:marker');
  storage.remove('spotlight:lastFile');
  storage.remove('spotlight:lastAt');
  setPayload('none');
}

function SpotlightActions({
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
            testID="btn-seed-appsearch"
            accessibilityLabel="Seed AppSearch"
            style={styles.button}
            onPress={() => seedAppSearch(setPayload)}
          >
            <Text style={styles.buttonText}>Seed AppSearch</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="btn-query-appsearch"
            accessibilityLabel="Query AppSearch"
            style={styles.button}
            onPress={() => queryAppSearch(setPayload)}
          >
            <Text style={styles.buttonText}>Query AppSearch</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text accessibilityLabel="spotlight-fixture-hint">
          Write et-import.etspot into Documents (journey uses simctl)
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
        onPress={() => clearSpotlightPayload(setPayload)}
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
    const marker = storage.get<string>('spotlight:marker');
    const file = storage.get<string>('spotlight:lastFile');
    if (marker || file) {
      setPayload(JSON.stringify({ marker, file }));
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
      <Text style={styles.title}>ET Spotlight</Text>
      <Text testID="status-target-ready">{ready ? 'ready' : 'loading'}</Text>
      <Text testID="text-extension-type">spotlight</Text>
      <Text testID="text-bundle-suffix">com.expotargets.example.spotlight</Text>
      <Text style={styles.hint} testID="text-platform-note">
        {Platform.OS === 'android'
          ? 'Android: AppSearch index + query should surface ET Spotlight marker.'
          : 'Write et-import.etspot into Documents (journey uses simctl)'}
      </Text>
      <SpotlightActions
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
