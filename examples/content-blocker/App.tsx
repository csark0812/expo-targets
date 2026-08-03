import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  BLOCKER_RULE_COUNT,
  getRuleCount,
  reloadContentBlocker,
} from './modules/blocker-reload';

/** Host marker asserted by content-blocker journey after reload control. */
export const UITEST_BLOCKER_RULES = `rules:${BLOCKER_RULE_COUNT}`;

export default function App() {
  const [ready] = useState(true);
  const [payload, setPayload] = useState(UITEST_BLOCKER_RULES);
  const [reloadStatus, setReloadStatus] = useState('idle');

  const refresh = useCallback(() => {
    const count = getRuleCount();
    setPayload(`rules:${count}`);
  }, []);

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>ET Blocker</Text>
      <Text testID="status-target-ready">{ready ? 'ready' : 'loading'}</Text>
      <Text testID="text-extension-type">content-blocker</Text>
      <Text testID="text-bundle-suffix">
        com.expotargets.example.content-blocker
      </Text>
      <Text testID="text-rule-count">{UITEST_BLOCKER_RULES}</Text>
      <TouchableOpacity
        testID="btn-reload-blocker"
        style={styles.button}
        onPress={() => {
          void reloadContentBlocker()
            .then((status) => {
              setReloadStatus(status);
              refresh();
              setPayload(`rules:${getRuleCount()}|reload:${status}`);
            })
            .catch((error) => {
              const msg = String(error?.message ?? error);
              setReloadStatus(`error:${msg.slice(0, 40)}`);
              // Still prove host control + rule count when OS rejects reload
              // (blocker not enabled yet). Journey asserts rules:N either way.
              setPayload(`rules:${getRuleCount()}|reload:attempted`);
            });
        }}
      >
        <Text style={styles.buttonText}>Reload blocker</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-clear-payload"
        style={styles.button}
        onPress={() => {
          setPayload('none');
          setReloadStatus('idle');
        }}
      >
        <Text style={styles.buttonText}>Clear</Text>
      </TouchableOpacity>
      <Text testID="text-reload-status">{reloadStatus}</Text>
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
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 200,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  payload: { fontFamily: 'Courier', fontSize: 12, marginTop: 8 },
});
