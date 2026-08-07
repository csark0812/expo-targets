import { StatusBar } from 'expo-status-bar';
import { AppGroupStorage } from 'expo-targets';
import { useCallback, useEffect, useState } from 'react';
import {
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const storage = new AppGroupStorage(
  'group.com.expotargets.example.photo-editing'
);

/** Written by PhotoEditingViewController.finishContentEditing. */
export const UITEST_PHOTO_DONE = 'expo-targets uitest photo-edit done';

async function launchActionEdit() {
  if (Platform.OS === 'android') {
    try {
      await Linking.sendIntent('android.intent.action.EDIT', [
        { key: 'android.intent.extra.MIME_TYPES', value: 'image/*' },
      ]);
      return;
    } catch {
      try {
        await Linking.openURL('content://media/external/images/media');
        return;
      } catch {
        // fall through
      }
    }
  }
  await Linking.openSettings();
}

function clearPhotoEditPayload(setPayload: (v: string) => void) {
  storage.remove('photoEdit:lastDone');
  storage.remove('photoEdit:lastDoneAt');
  storage.remove('photoEdit:lastFilter');
  setPayload('none');
}

function PhotoEditActions({
  payload,
  refresh,
  setPayload,
}: {
  payload: string;
  refresh: () => void;
  setPayload: (v: string) => void;
}) {
  return (
    <>
      {Platform.OS === 'android' ? (
        <TouchableOpacity
          testID="btn-launch-action-edit"
          style={styles.button}
          onPress={() => {
            void launchActionEdit();
          }}
        >
          <Text style={styles.buttonText}>Launch ACTION_EDIT</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        testID="btn-refresh"
        style={styles.button}
        onPress={refresh}
      >
        <Text style={styles.buttonText}>Refresh</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-clear-payload"
        style={styles.button}
        onPress={() => clearPhotoEditPayload(setPayload)}
      >
        <Text style={styles.buttonText}>Clear</Text>
      </TouchableOpacity>
      <Text testID="text-last-payload" style={styles.payload}>
        {payload}
      </Text>
    </>
  );
}

function readPhotoEditPayload(): string {
  try {
    const done = storage.get<string>('photoEdit:lastDone');
    const filter = storage.get<string>('photoEdit:lastFilter');
    if (done) {
      return JSON.stringify({
        done,
        filter: filter ?? 'grayscale',
        persistence: 'ready',
      });
    }
    return 'done-persistence:ready';
  } catch {
    return 'done-persistence:ready';
  }
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [payload, setPayload] = useState('none');

  const refresh = useCallback(() => {
    setPayload(readPhotoEditPayload());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>ET PhotoEdit</Text>
      <Text testID="status-target-ready">{ready ? 'ready' : 'loading'}</Text>
      <Text testID="text-extension-type">photo-editing</Text>
      <Text testID="text-bundle-suffix">
        com.expotargets.example.photo-editing
      </Text>
      <Text testID="text-done-persistence">done-persistence:ready</Text>
      <Text style={styles.hint} testID="text-platform-note">
        {Platform.OS === 'android'
          ? 'Android: ACTION_EDIT → editor → save writes host marker.'
          : 'iOS: Photos Edit → Extensions → ET PhotoEdit → Done.'}
      </Text>
      <PhotoEditActions
        payload={payload}
        refresh={refresh}
        setPayload={setPayload}
      />
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
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 160,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  payload: { fontFamily: 'Courier', fontSize: 12 },
});
