import { StatusBar } from 'expo-status-bar';
import { AppGroupStorage } from 'expo-targets';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const storage = new AppGroupStorage('group.com.expotargets.example.spotlight');

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
      <Text accessibilityLabel="spotlight-fixture-hint">
        Write et-import.etspot into Documents (journey uses simctl)
      </Text>
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
        onPress={() => {
          storage.remove('spotlight:marker');
          storage.remove('spotlight:lastFile');
          storage.remove('spotlight:lastAt');
          setPayload('none');
        }}
      >
        <Text style={styles.buttonText}>Clear</Text>
      </TouchableOpacity>
      <Text testID="text-last-payload" style={styles.payload}>
        {payload}
      </Text>
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
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  payload: { marginTop: 8, textAlign: 'center' },
});
