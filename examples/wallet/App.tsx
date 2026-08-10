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

async function openGoogleWallet() {
  if (Platform.OS === 'android') {
    for (const url of [
      'https://pay.google.com/gp/v/save/',
      'market://details?id=com.google.android.apps.walletnfcrel',
    ]) {
      try {
        await Linking.openURL(url);
        return;
      } catch {
        // try next
      }
    }
  }
  await Linking.openSettings();
}

export default function App() {
  const [payload, setPayload] = useState('none');

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>ET Wallet</Text>
      <Text testID="status-target-ready">ready</Text>
      <Text testID="text-extension-type">wallet</Text>
      <Text testID="text-bundle-suffix">com.expotargets.example.wallet</Text>
      <Text style={styles.hint} testID="text-platform-note">
        {Platform.OS === 'android'
          ? 'Android: Google Wallet/pass host surface (Play image). Issuer Activity is wallet-ui.'
          : 'iOS: PassKit / issuer extension.'}
      </Text>
      <TouchableOpacity
        testID="btn-seed-pass"
        style={styles.button}
        onPress={() => setPayload('pass:seeded')}
      >
        <Text style={styles.buttonText}>Seed pass</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-open-wallet"
        style={styles.button}
        onPress={() => {
          void openGoogleWallet().then(() => setPayload('opened-wallet'));
        }}
      >
        <Text style={styles.buttonText}>Open Wallet</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-open-issuer-activity"
        style={styles.button}
        onPress={() => {
          setPayload('issuer:chrome');
        }}
      >
        <Text style={styles.buttonText}>Open issuer Activity</Text>
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
