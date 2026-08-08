import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function App() {
  const [payload, setPayload] = useState('none');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>ET BgDL</Text>
      <Text testID="status-target-ready">ready</Text>
      <Text testID="text-extension-type">bg-download</Text>
      <Text testID="text-bundle-suffix">
        com.expotargets.example.bg-download
      </Text>
      <Text style={styles.hint} testID="text-platform-note">
        {Platform.OS === 'android'
          ? 'Android: enqueue Download/WorkManager; host marker updates on completion.'
          : 'iOS: Settings Apps host registration floor.'}
      </Text>
      <TouchableOpacity
        testID="btn-enqueue-download"
        style={styles.button}
        onPress={() => {
          if (timer.current) clearTimeout(timer.current);
          setPayload('download:enqueued');
          // Without native DownloadManager wiring this never reaches complete —
          // journeys assert completion and os-limit after honest enqueue.
          // When a native facade lands, it should set download:complete / workmanager:complete.
          timer.current = setTimeout(() => {
            // Leave as enqueued — completion requires native Download/WorkManager.
          }, 500);
        }}
      >
        <Text style={styles.buttonText}>Enqueue download</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-refresh"
        style={styles.button}
        onPress={() => {
          /* no-op refresh — payload is state-driven */
        }}
      >
        <Text style={styles.buttonText}>Refresh</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-clear-payload"
        style={styles.button}
        onPress={() => {
          if (timer.current) clearTimeout(timer.current);
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
  hint: { color: '#666', fontSize: 13, textAlign: 'center' },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  payload: { fontFamily: 'Courier', fontSize: 12 },
});
