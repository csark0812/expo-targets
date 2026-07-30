import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getMessage, helloWidget, updateMessage } from './targets/hello-widget';

export default function App() {
  const [payload, setPayload] = useState('none');
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setPayload(getMessage() ?? 'none');
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>Widgets example</Text>
      <Text testID="status-target-ready">{ready ? 'ready' : 'loading'}</Text>
      <TouchableOpacity
        testID="btn-seed-payload"
        style={styles.button}
        onPress={() => {
          updateMessage('Hello from host');
          refresh();
        }}
      >
        <Text style={styles.buttonText}>Seed payload</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-clear-payload"
        style={styles.button}
        onPress={() => {
          helloWidget.setData({ message: '' });
          helloWidget.refresh();
          refresh();
        }}
      >
        <Text style={styles.buttonText}>Clear payload</Text>
      </TouchableOpacity>
      <Text testID="text-last-payload" style={styles.payload}>
        {payload}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  payload: { fontFamily: 'Courier', fontSize: 12 },
});
