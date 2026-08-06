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
  const [payload, setPayload] = useState(
    Platform.OS === 'android' ? 'vpn:fail-closed' : 'none'
  );

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>ET NETunnel</Text>
      <Text testID="status-target-ready">ready</Text>
      <Text testID="text-extension-type">network-packet-tunnel</Text>
      <Text testID="text-bundle-suffix">
        com.expotargets.example.network-packet-tunnel
      </Text>
      <Text style={styles.hint} testID="text-platform-note">
        {Platform.OS === 'android'
          ? 'Android: VpnService registered fail-closed (no establish without prepare). VPN consent leftover.'
          : 'iOS: NEPacketTunnelProvider fail-closed without entitlement.'}
      </Text>
      <TouchableOpacity
        testID="btn-vpn-status"
        style={styles.button}
        onPress={() => {
          setPayload(
            Platform.OS === 'android'
              ? 'vpn:registered-fail-closed'
              : 'ne:registered-fail-closed'
          );
        }}
      >
        <Text style={styles.buttonText}>Show registration status</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-open-settings"
        style={styles.button}
        onPress={() => {
          void Linking.openSettings().then(() => setPayload('opened-settings'));
        }}
      >
        <Text style={styles.buttonText}>Open Settings</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-clear-payload"
        style={styles.button}
        onPress={() =>
          setPayload(Platform.OS === 'android' ? 'vpn:fail-closed' : 'none')
        }
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
