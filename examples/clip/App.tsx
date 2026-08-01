import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { clipTarget } from './targets/clip';

export default function App() {
  const [payload, setPayload] = useState('none');
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    const data = clipTarget.getData<{ itemName?: string; price?: string }>();
    setPayload(data?.itemName ? JSON.stringify(data) : 'none');
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
      <Text style={styles.title}>Clip example</Text>
      <Text testID="status-target-ready">{ready ? 'ready' : 'loading'}</Text>
      <TouchableOpacity
        testID="btn-seed-payload"
        style={styles.button}
        onPress={() => {
          clipTarget.setData({
            itemName: 'seeded item',
            price: '$9.99',
            timestamp: Date.now(),
          });
          refresh();
        }}
      >
        <Text style={styles.buttonText}>Seed payload</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-clear-payload"
        style={styles.button}
        onPress={() => {
          clipTarget.setData({});
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
