import { StatusBar } from 'expo-status-bar';
import { AppGroupStorage } from 'expo-targets';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const storage = new AppGroupStorage(
  'group.com.expotargets.example.photo-editing'
);

/** Written by PhotoEditingViewController.finishContentEditing. */
export const UITEST_PHOTO_DONE = 'expo-targets uitest photo-edit done';

export default function App() {
  const [ready, setReady] = useState(false);
  const [payload, setPayload] = useState('none');

  const refresh = useCallback(() => {
    try {
      const done = storage.get<string>('photoEdit:lastDone');
      const filter = storage.get<string>('photoEdit:lastFilter');
      if (done) {
        setPayload(
          JSON.stringify({
            done,
            filter: filter ?? 'grayscale',
            persistence: 'ready',
          })
        );
      } else {
        setPayload('done-persistence:ready');
      }
    } catch {
      setPayload('done-persistence:ready');
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
      <Text style={styles.title}>ET PhotoEdit</Text>
      <Text testID="status-target-ready">{ready ? 'ready' : 'loading'}</Text>
      <Text testID="text-extension-type">photo-editing</Text>
      <Text testID="text-bundle-suffix">
        com.expotargets.example.photo-editing
      </Text>
      <Text testID="text-done-persistence">done-persistence:ready</Text>
      <TouchableOpacity
        testID="btn-refresh"
        style={styles.button}
        onPress={refresh}
      >
        <Text style={styles.buttonText}>Refresh</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-clear-payload"
        style={styles.button}
        onPress={() => {
          storage.remove('photoEdit:lastDone');
          storage.remove('photoEdit:lastDoneAt');
          storage.remove('photoEdit:lastFilter');
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
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 160,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  payload: { fontFamily: 'Courier', fontSize: 12 },
});
