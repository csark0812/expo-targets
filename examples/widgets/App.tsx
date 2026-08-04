import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getMessage, helloWidget, updateMessage } from './targets/hello-widget';

/** Seeded host marker for Devicewright (avoid `|` — can confuse AX splits). */
export const UITEST_WIDGET_SEED = 'Hello from host · family:systemSmall';

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
      <Text testID="text-widget-families">
        families:systemSmall,systemMedium
      </Text>
      <Text testID="text-widget-intent-note">
        intent: StaticConfiguration · seed family:systemSmall
      </Text>
      <TouchableOpacity
        testID="btn-seed-payload"
        style={styles.button}
        onPress={() => {
          updateMessage(UITEST_WIDGET_SEED);
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
      {/* Split seed parts — AX often truncates pipe-joined payload labels. */}
      <Text
        testID="text-last-payload"
        style={styles.payload}
        numberOfLines={4}
        accessibilityLabel={payload}
      >
        {payload}
      </Text>
      <Text testID="text-seed-message" style={styles.payload}>
        {payload.includes('Hello from host')
          ? 'seed:Hello from host'
          : `seed-miss:${payload}`}
      </Text>
      <Text testID="text-seed-family" style={styles.payload}>
        {payload.includes('family:systemSmall')
          ? 'seed:family:systemSmall'
          : `family-miss:${payload}`}
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
