import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * Honest pack catalog for Devicewright Stickers A.
 * Must stay in sync with targets/stickers/expo-target.config.json stickerPacks.
 * Asset-only MSSticker packs cannot write App Group on selection — host marker
 * reflects installed pack assets, not Maestro in-memory seed theater.
 */
export const PACK_CATALOG_MARKER =
  'pack: Fun Stickers (bip, wave, hug, peek, jump, sit, heart)';

export default function App() {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState(PACK_CATALOG_MARKER);

  useEffect(() => {
    setStatus(PACK_CATALOG_MARKER);
    setReady(true);
  }, []);

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>Stickers example</Text>
      <Text testID="status-target-ready">{ready ? 'ready' : 'loading'}</Text>
      <Text style={styles.note}>
        Asset-only iMessage sticker pack — host catalog mirrors installed assets
        (selection cannot App-Group).
      </Text>
      <Text testID="status-pack-catalog" style={styles.payload}>
        {PACK_CATALOG_MARKER}
      </Text>
      <TouchableOpacity
        testID="btn-show-pack-catalog"
        style={styles.button}
        onPress={() => setStatus(PACK_CATALOG_MARKER)}
      >
        <Text style={styles.buttonText}>Show pack catalog</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-clear-payload"
        style={styles.button}
        onPress={() => setStatus('none')}
      >
        <Text style={styles.buttonText}>Clear status</Text>
      </TouchableOpacity>
      <Text testID="text-last-payload" style={styles.payload}>
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  note: { color: '#666', fontSize: 14 },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  payload: { fontFamily: 'Courier', fontSize: 12 },
});
