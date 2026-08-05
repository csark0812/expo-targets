import type { ExtensionTarget } from 'expo-targets';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { OTA_LABEL } from '../otaLabel';

type Props = {
  target: ExtensionTarget;
  text?: string;
  url?: string;
};

export default function ShareExtension({ target, text, url }: Props) {
  return (
    <View style={styles.container} testID="share-extension-root">
      <Text style={styles.title}>Updates Share</Text>
      <Text testID="share-ota-label" style={styles.ota}>
        OTA: {OTA_LABEL}
      </Text>
      <Text testID="share-payload">{text || url || 'No content'}</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => target.close()}
        testID="btn-share-close"
      >
        <Text style={styles.buttonText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  ota: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A7',
    fontFamily: 'Courier',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
