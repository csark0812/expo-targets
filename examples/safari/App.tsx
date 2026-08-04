import { StatusBar } from 'expo-status-bar';
import { AppGroupStorage } from 'expo-targets';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const storage = new AppGroupStorage('group.com.expotargets.example.safari');

/** Popup surface marker (RN popup entry exists in host scaffolding). */
export const UITEST_SAFARI_POPUP = 'expo-targets uitest safari rn';
/** Written by content.js → native handler into App Group. */
export const UITEST_SAFARI_CONTENT = 'expo-targets uitest safari content';
export const UITEST_SAFARI_NATIVE = 'expo-targets uitest safari native-msg';

export default function App() {
  const [ready, setReady] = useState(false);
  const [payload, setPayload] = useState('none');
  const [nativeMsg, setNativeMsg] = useState('none');

  const refresh = useCallback(() => {
    let native = 'none';
    try {
      native = storage.get<string>('safari:lastNativeMsg') ?? 'none';
    } catch {
      native = 'none';
    }
    setNativeMsg(native);
    const contentLive =
      native !== 'none' ? UITEST_SAFARI_CONTENT : 'content-pending';
    const nativeLive = native !== 'none' ? native : 'native-pending';
    // popup is host scaffolding; content/native only go live after appex runtime ping.
    setPayload(
      `popup:${UITEST_SAFARI_POPUP}|content-script:${contentLive}|native-msg:${nativeLive}`
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
      <Text testID="text-bundle-suffix">com.expotargets.example.safari</Text>
      <Text testID="text-safari-popup">{UITEST_SAFARI_POPUP}</Text>
      <Text testID="text-safari-content">
        {nativeMsg !== 'none' ? UITEST_SAFARI_CONTENT : 'content-pending'}
      </Text>
      <Text testID="text-safari-native-msg">
        {nativeMsg !== 'none' ? UITEST_SAFARI_NATIVE : 'native-pending'}
      </Text>
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
          try {
            storage.set('safari:lastNativeMsg', '');
            storage.set('safari:lastNativeMsgAt', 0);
          } catch {
            /* ignore */
          }
          setPayload('none');
          setNativeMsg('none');
        }}
      >
        <Text style={styles.buttonText}>Clear</Text>
      </TouchableOpacity>
      <Text testID="text-native-msg-status" style={styles.payload}>
        lastNative:{nativeMsg || 'none'}
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
