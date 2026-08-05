import { StatusBar } from 'expo-status-bar';
import { AppGroupStorage } from 'expo-targets';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const storage = new AppGroupStorage(
  'group.com.expotargets.example.app-intent'
);

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
      <Text accessibilityLabel="ai-shortcuts-hint">
        Shortcuts → ET Greet run writes App Group
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
        accessibilityLabel="Clear"
        style={styles.button}
        onPress={() => {
          storage.remove('ai:marker');
          storage.remove('ai:result');
          storage.remove('ai:lastAt');
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
