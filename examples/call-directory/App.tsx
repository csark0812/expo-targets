import { StatusBar } from 'expo-status-bar';
import { AppGroupStorage } from 'expo-targets';
import { useCallback, useState } from 'react';
import {
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const APP_GROUP = 'group.com.expotargets.example.call-directory';
const storage = new AppGroupStorage(APP_GROUP);

export default function App() {
  const [payload, setPayload] = useState(
    () => storage.get<string>('blocked_numbers') ?? 'none'
  );

  const refresh = useCallback(() => {
    setPayload(storage.get<string>('blocked_numbers') ?? 'none');
  }, []);

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>ET CallDir</Text>
      <Text testID="status-target-ready">ready</Text>
      <Text testID="text-extension-type">call-directory</Text>
      <Text testID="text-bundle-suffix">
        com.expotargets.example.call-directory
      </Text>
      <Text style={styles.hint} testID="text-platform-note">
        {Platform.OS === 'android'
          ? 'Android: CallScreeningService reads blocked_numbers CSV. Role grant is leftover.'
          : 'iOS: Call Directory extension + Phone Settings.'}
      </Text>
      <TouchableOpacity
        testID="btn-seed-blocked"
        style={styles.button}
        onPress={() => {
          storage.set('blocked_numbers', '5550100,5550199');
          refresh();
        }}
      >
        <Text style={styles.buttonText}>Seed blocked numbers</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-clear-payload"
        style={styles.button}
        onPress={() => {
          storage.set('blocked_numbers', '');
          refresh();
        }}
      >
        <Text style={styles.buttonText}>Clear</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-open-settings"
        style={styles.button}
        onPress={() => {
          void Linking.openSettings();
        }}
      >
        <Text style={styles.buttonText}>Open Settings</Text>
      </TouchableOpacity>
      <Text testID="text-last-payload" style={styles.payload}>
        {payload || 'none'}
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
