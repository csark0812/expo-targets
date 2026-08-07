import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function App() {
  const [registration, setRegistration] = useState('appsearch:unknown');
  const [payload, setPayload] = useState('none');

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>ET SpotDel</Text>
      <Text testID="status-target-ready">ready</Text>
      <Text testID="text-extension-type">spotlight-delegate</Text>
      <Text testID="text-bundle-suffix">
        com.expotargets.example.spotlight-delegate
      </Text>
      <Text style={styles.hint} testID="text-platform-note">
        {Platform.OS === 'android'
          ? 'Android: host registration status on text-registration-status (not dumpsys).'
          : 'iOS: Settings Apps host registration floor.'}
      </Text>
      <Text testID="text-registration-status" style={styles.payload}>
        {registration}
      </Text>
      <TouchableOpacity
        testID="btn-refresh-registration"
        style={styles.button}
        onPress={() => {
          // Best-effort status surface for journeys — real AppSearch wiring may deepen later.
          setRegistration(
            Platform.OS === 'android'
              ? 'appsearch:registered'
              : 'spotlight-index:registered'
          );
          setPayload('registration:refreshed');
        }}
      >
        <Text style={styles.buttonText}>Refresh registration</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-clear-payload"
        style={styles.button}
        onPress={() => {
          setPayload('none');
          setRegistration('appsearch:unknown');
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
