import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function App() {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Fun Stickers pack (3 assets)');

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>Stickers example</Text>
      <Text testID="status-target-ready">{ready ? 'ready' : 'loading'}</Text>
      <Text style={styles.note}>
        Asset-only iMessage sticker pack — no React Native extension entry.
      </Text>
      <TouchableOpacity
        testID="btn-seed-payload"
        style={styles.button}
        onPress={() => setStatus('pack: Fun Stickers (brutus, happy, excited)')}
      >
        <Text style={styles.buttonText}>Show pack status</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-clear-payload"
        style={styles.button}
        onPress={() => setStatus('none')}
      >
        <Text style={styles.buttonText}>Clear status</Text>
      </TouchableOpacity>
      <Text testID="text-last-payload" style={styles.payload}>
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  note: { color: '#666', fontSize: 14 },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  payload: { fontFamily: 'Courier', fontSize: 12 },
});
