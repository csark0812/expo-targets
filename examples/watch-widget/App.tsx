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
  const [marker, setMarker] = useState('none');
  const [payload, setPayload] = useState('none');

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>ET WatchW</Text>
      <Text testID="status-target-ready">ready</Text>
      <Text testID="text-extension-type">watch-widget</Text>
      <Text testID="text-bundle-suffix">
        com.expotargets.example.watch-widget
      </Text>
      <Text style={styles.hint} testID="text-platform-note">
        {Platform.OS === 'android'
          ? 'Android: Wear pair + Wear tile/complication AX should show ET Watch Widget.'
          : 'iOS: watchOS companion + nested watch-widget PlugIns.'}
      </Text>
      <Text testID="text-wear-companion-marker" style={styles.payload}>
        {marker}
      </Text>
      <TouchableOpacity
        testID="btn-show-wear-marker"
        style={styles.button}
        onPress={() => {
          setMarker('ET Watch Widget');
          setPayload('tile:host-hint');
        }}
      >
        <Text style={styles.buttonText}>Show tile marker hint</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-clear-payload"
        style={styles.button}
        onPress={() => {
          setMarker('none');
          setPayload('none');
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
