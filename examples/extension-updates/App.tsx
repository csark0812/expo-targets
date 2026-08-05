/**
 * Host import of expo-targets auto-enables ExtensionUpdates (App Group sync).
 * We also import the API for the fetch/sync buttons below.
 */
import { ExtensionUpdates } from 'expo-targets';
import * as Updates from 'expo-updates';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { OTA_LABEL } from './targets/share/otaLabel';

type HostButtonProps = {
  testID: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

function HostButton({ testID, label, onPress, disabled }: HostButtonProps) {
  return (
    <TouchableOpacity
      testID={testID}
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function App() {
  const [log, setLog] = useState('idle');
  const [busy, setBusy] = useState(false);

  const append = useCallback((line: string) => {
    setLog((prev) => `${line}\n---\n${prev}`);
  }, []);

  const check = useCallback(async () => {
    setBusy(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      append(
        `check: available=${result.isAvailable}` +
          (result.reason ? ` reason=${result.reason}` : '')
      );
    } catch (error) {
      append(`check error: ${error instanceof Error ? error.message : error}`);
    } finally {
      setBusy(false);
    }
  }, [append]);

  const fetchAndSync = useCallback(async () => {
    setBusy(true);
    try {
      const api = ExtensionUpdates.enable({ syncOnStart: false });
      if (!api.enabled) {
        append(`enable failed: ${api.reason}`);
        return;
      }
      const fetched = await api.fetchUpdateAsync();
      append(
        `fetch: isNew=${fetched.isNew} installed=${fetched.installed.length}` +
          (fetched.reason ? ` reason=${fetched.reason}` : '')
      );
      if (fetched.isNew) {
        append('reloading host…');
        await api.reloadAsync();
      }
    } catch (error) {
      append(`fetch error: ${error instanceof Error ? error.message : error}`);
    } finally {
      setBusy(false);
    }
  }, [append]);

  const syncOnly = useCallback(async () => {
    setBusy(true);
    try {
      const api = ExtensionUpdates.enable({ syncOnStart: false });
      if (!api.enabled) {
        append(`enable failed: ${api.reason}`);
        return;
      }
      const installed = await api.syncFromCurrentUpdate();
      append(`sync: installed=${installed.length}`);
    } catch (error) {
      append(`sync error: ${error instanceof Error ? error.message : error}`);
    } finally {
      setBusy(false);
    }
  }, [append]);

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>Extension Updates</Text>
      <Text testID="host-ota-label" style={styles.ota}>
        Host OTA: {OTA_LABEL}
      </Text>
      <Text testID="updates-meta" style={styles.meta}>
        embedded={String(Updates.isEmbeddedLaunch)}
        {'\n'}
        runtime={Updates.runtimeVersion ?? '(none)'}
        {'\n'}
        updateId={Updates.updateId ?? '(none)'}
      </Text>

      <HostButton
        testID="btn-check"
        label="Check for update"
        onPress={() => void check()}
        disabled={busy}
      />
      <HostButton
        testID="btn-fetch-sync"
        label="Fetch + sync App Group + reload"
        onPress={() => void fetchAndSync()}
        disabled={busy}
      />
      <HostButton
        testID="btn-sync-only"
        label="Sync App Group from current update"
        onPress={() => void syncOnly()}
        disabled={busy}
      />
      <HostButton
        testID="btn-open-share"
        label="Open Share Sheet"
        onPress={() => {
          void Share.share({
            message: 'extension-updates probe',
            url: 'https://example.com/expo-targets-extension-updates',
          });
        }}
        disabled={busy}
      />

      {busy ? <ActivityIndicator /> : null}
      <Text testID="updates-log" style={styles.log}>
        {log}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  ota: {
    fontSize: 18,
    fontWeight: '800',
    color: '#007755',
  },
  meta: { fontSize: 12, color: '#333' },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '600' },
  log: { fontFamily: 'Courier', fontSize: 11, marginTop: 8 },
});
