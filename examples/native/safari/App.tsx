import { StatusBar } from 'expo-status-bar';
import { AppGroupStorage } from 'expo-targets';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const storage = new AppGroupStorage(
  'group.com.expotargets.example.native.safari'
);

export const UITEST_SAFARI_POPUP = 'expo-targets uitest safari popup';
export const UITEST_SAFARI_CONTENT = 'expo-targets uitest safari content';
export const UITEST_SAFARI_NATIVE = 'expo-targets uitest safari native-msg';

export default function App() {
  const [ready, setReady] = useState(false);
  const [payload, setPayload] = useState('none');
  const [nativeMsg, setNativeMsg] = useState('none');

  const refresh = useCallback(() => {
    try {
      setNativeMsg(storage.get<string>('safari:lastNativeMsg') ?? 'none');
    } catch {
      setNativeMsg('none');
    }
    setPayload(
      `popup:${UITEST_SAFARI_POPUP}|content-script:${UITEST_SAFARI_CONTENT}|native-msg:${UITEST_SAFARI_NATIVE}`
    );
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>ET Safari</Text>
      <Text testID="status-target-ready">{ready ? 'ready' : 'loading'}</Text>
      <Text testID="text-extension-type">safari</Text>
      <Text testID="text-bundle-suffix">
        com.expotargets.example.native.safari
      </Text>
      <Text testID="text-safari-popup">{UITEST_SAFARI_POPUP}</Text>
      <Text testID="text-safari-content">{UITEST_SAFARI_CONTENT}</Text>
      <Text testID="text-safari-native-msg">{UITEST_SAFARI_NATIVE}</Text>
      <TouchableOpacity
        testID="btn-refresh-safari"
        style={styles.button}
        onPress={refresh}
      >
        <Text style={styles.buttonText}>Refresh surfaces</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-clear-payload"
        style={styles.button}
        onPress={() => {
          setPayload('none');
          setNativeMsg('none');
        }}
      >
        <Text style={styles.buttonText}>Clear</Text>
      </TouchableOpacity>
      <Text testID="text-native-msg-status" style={styles.payload}>
        lastNative:{nativeMsg}
      </Text>
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
    gap: 8,
  },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 200,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  payload: { fontFamily: 'Courier', fontSize: 11 },
});
