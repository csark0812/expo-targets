/**
 * Host import of expo-targets auto-enables ExtensionUpdates (App Group sync).
 * We also import the API for the fetch/sync buttons below.
 */

import { StatusBar } from 'expo-status-bar';
import { ExtensionUpdates } from 'expo-targets';
import * as Updates from 'expo-updates';
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
import { SPIKE_ENV_TAG } from './targets/share/spikeMarkers';

type HostButtonProps = {
  testID: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

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

async function runExtensionUpdate(
  mode: 'fetch' | 'sync',
  append: (line: string) => void
) {
  const api = ExtensionUpdates.enable({ syncOnStart: false });
  if (!api.enabled) {
    append(`enable failed: ${api.reason}`);
    return null;
  }
  if (mode === 'sync') {
    const installed = await api.syncFromCurrentUpdate();
    append(`sync: installed=${installed.length}`);
    return api;
  }
  const fetched = await api.fetchUpdateAsync();
  append(
    `fetch: isNew=${fetched.isNew} installed=${fetched.installed.length}` +
      (fetched.reason ? ` reason=${fetched.reason}` : '')
  );
  return { api, fetched };
}

function useExtensionUpdateActions(
  append: (line: string) => void,
  setBusy: (busy: boolean) => void
) {
  const check = useCallback(async () => {
    setBusy(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      append(
        `check: available=${result.isAvailable}` +
          (result.reason ? ` reason=${result.reason}` : '')
      );
    } catch (error) {
      append(`check error: ${formatError(error)}`);
    } finally {
      setBusy(false);
    }
  }, [append, setBusy]);

  const fetchAndSync = useCallback(async () => {
    setBusy(true);
    try {
      const result = await runExtensionUpdate('fetch', append);
      if (result && 'fetched' in result && result.fetched.isNew) {
        append('reloading host…');
        await result.api.reloadAsync();
      }
    } catch (error) {
      append(`fetch error: ${formatError(error)}`);
    } finally {
      setBusy(false);
    }
  }, [append, setBusy]);

  const syncOnly = useCallback(async () => {
    setBusy(true);
    try {
      await runExtensionUpdate('sync', append);
    } catch (error) {
      append(`sync error: ${formatError(error)}`);
    } finally {
      setBusy(false);
    }
  }, [append, setBusy]);

  return { check, fetchAndSync, syncOnly };
}

function ExtensionUpdatesControls({
  busy,
  onCheck,
  onFetchAndSync,
  onSyncOnly,
}: {
  busy: boolean;
  onCheck: () => void;
  onFetchAndSync: () => void;
  onSyncOnly: () => void;
}) {
  return (
    <>
      <HostButton
        testID="btn-check"
        label="Check for update"
        onPress={onCheck}
        disabled={busy}
      />
      <HostButton
        testID="btn-fetch-sync"
        label="Fetch + sync App Group + reload"
        onPress={onFetchAndSync}
        disabled={busy}
      />
      <HostButton
        testID="btn-sync-only"
        label="Sync App Group from current update"
        onPress={onSyncOnly}
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
    </>
  );
}

export default function App() {
  const [log, setLog] = useState('idle');
  const [busy, setBusy] = useState(false);

  const append = useCallback((line: string) => {
    setLog((prev) => `${line}\n---\n${prev}`);
  }, []);

  const { check, fetchAndSync, syncOnly } = useExtensionUpdateActions(
    append,
    setBusy
  );

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>Extension Updates</Text>
      <Text testID="host-ota-label" style={styles.ota}>
        Host OTA: {OTA_LABEL}
      </Text>
      <Text testID="host-env-tag" style={styles.meta}>
        env: {SPIKE_ENV_TAG}
      </Text>
      <Text testID="updates-meta" style={styles.meta}>
        embedded={String(Updates.isEmbeddedLaunch)}
        {'\n'}
        runtime={Updates.runtimeVersion ?? '(none)'}
        {'\n'}
        updateId={Updates.updateId ?? '(none)'}
      </Text>

      <ExtensionUpdatesControls
        busy={busy}
        onCheck={() => void check()}
        onFetchAndSync={() => void fetchAndSync()}
        onSyncOnly={() => void syncOnly()}
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
