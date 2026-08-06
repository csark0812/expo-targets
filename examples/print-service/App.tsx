import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

async function openPrintSettings() {
  if (Platform.OS === 'android') {
    try {
      await Linking.sendIntent('android.settings.PRINT_SETTINGS');
      return;
    } catch {
      // fall through
    }
  }
  await Linking.openSettings();
}

export default function App() {
  const [payload, setPayload] = useState('none');

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>ET Print</Text>
      <Text testID="status-target-ready">ready</Text>
      <Text testID="text-extension-type">print-service</Text>
      <Text testID="text-bundle-suffix">
        com.expotargets.example.print-service
      </Text>
      <Text style={styles.hint} testID="text-platform-note">
        {Platform.OS === 'android'
          ? 'Android: PrintService registered (empty discovery). Settings enablement may leftover.'
          : 'iOS: Print Service extension — Settings Apps registration floor.'}
      </Text>
      <TouchableOpacity
        testID="btn-open-print-settings"
        style={styles.button}
        onPress={() => {
          void openPrintSettings().then(() => setPayload('opened-settings'));
        }}
      >
        <Text style={styles.buttonText}>Open print settings</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-clear-payload"
        style={styles.button}
        onPress={() => setPayload('none')}
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
