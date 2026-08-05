import { StatusBar } from 'expo-status-bar';
import { AppGroupStorage, FileProviderDomain } from 'expo-targets';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const storage = new AppGroupStorage(
  'group.com.expotargets.example.file-provider'
);

function readPayload(): string {
  const marker = storage.get<string>('fp:marker');
  const file = storage.get<string>('fp:lastFile');
  return marker || file ? JSON.stringify({ marker, file }) : 'none';
}

function ActionButton({
  testID,
  label,
  secondary,
  onPress,
}: {
  testID: string;
  label: string;
  secondary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityLabel={label}
      style={secondary ? styles.buttonSecondary : styles.button}
      onPress={onPress}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function DomainControls({
  setDomain,
  refreshPayload,
  setPayload,
}: {
  setDomain: (v: string) => void;
  refreshPayload: () => void;
  setPayload: (v: string) => void;
}) {
  return (
    <>
      <ActionButton
        testID="btn-register-domain"
        label="Register domain"
        onPress={() => {
          void FileProviderDomain.register()
            .then((name) => setDomain(`registered:${name}`))
            .catch((e) => setDomain(`error:${String(e)}`));
        }}
      />
      <ActionButton
        testID="btn-unregister-domain"
        label="Unregister domain"
        secondary
        onPress={() => {
          void FileProviderDomain.unregister()
            .then(() => setDomain('not-registered'))
            .catch((e) => setDomain(`error:${String(e)}`));
        }}
      />
      <ActionButton
        testID="btn-refresh"
        label="Refresh"
        onPress={refreshPayload}
      />
      <ActionButton
        testID="btn-clear-payload"
        label="Clear payload"
        secondary
        onPress={() => {
          storage.remove('fp:marker');
          storage.remove('fp:lastFile');
          storage.remove('fp:lastAt');
          setPayload('none');
        }}
      />
    </>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [domain, setDomain] = useState('not-registered');
  const [payload, setPayload] = useState('none');
  const refreshPayload = useCallback(() => setPayload(readPayload()), []);

  useEffect(() => {
    // Drop any legacy domain registered with pathRelativeToDocumentStorage
    // (incompatible with NSFileProviderReplicatedExtension) then re-add.
    void FileProviderDomain.unregister()
      .catch(() => undefined)
      .then(() => FileProviderDomain.register())
      .then((name) => setDomain(`registered:${name}`))
      .catch((e) => setDomain(`error:${String(e)}`))
      .finally(() => {
        refreshPayload();
        setReady(true);
      });
    const interval = setInterval(refreshPayload, 2000);
    return () => clearInterval(interval);
  }, [refreshPayload]);

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>ET FileProv</Text>
      <Text testID="status-target-ready">{ready ? 'ready' : 'booting'}</Text>
      <Text testID="text-extension-type">file-provider</Text>
      <Text
        testID="text-files-domain"
        accessibilityLabel={`files-domain:${domain}`}
      >
        files-domain:{domain}
      </Text>
      <DomainControls
        setDomain={setDomain}
        refreshPayload={refreshPayload}
        setPayload={setPayload}
      />
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonSecondary: {
    backgroundColor: '#5856D6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  payload: { marginTop: 8, textAlign: 'center' },
});
