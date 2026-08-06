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

export default function App() {
  const [payload, setPayload] = useState('none');

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>ET FileProvUI</Text>
      <Text testID="status-target-ready">ready</Text>
      <Text testID="text-extension-type">file-provider-ui</Text>
      <Text testID="text-bundle-suffix">
        com.expotargets.example.file-provider-ui
      </Text>
      <Text style={styles.hint} testID="text-platform-note">
        {Platform.OS === 'android'
          ? 'Android: ExpoTargetsFileProviderUiActivity registered for VIEW */* (partial vs iOS actions). Open a file from Files/Drive and choose ET FileProvUI.'
          : 'iOS: File Provider UI action extension.'}
      </Text>
      <TouchableOpacity
        testID="btn-open-document-ui"
        style={styles.button}
        onPress={() => {
          void Linking.openSettings().then(() => setPayload('opened-settings'));
        }}
      >
        <Text style={styles.buttonText}>Open Settings</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-mark-registered"
        style={styles.button}
        onPress={() =>
          setPayload(
            Platform.OS === 'android'
              ? 'android:view-activity-registered'
              : 'ios:fpui-registered'
          )
        }
      >
        <Text style={styles.buttonText}>Show registration status</Text>
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
