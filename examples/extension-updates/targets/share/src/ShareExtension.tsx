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
      <View style={styles.otaBadge} testID="share-ota-label">
        <Text style={styles.ota}>OTA: {OTA_LABEL}</Text>
      </View>
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
  container: {
    flex: 1,
    padding: 20,
    gap: 12,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111111' },
  otaBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E6FFF5',
    borderWidth: 2,
    borderColor: '#00AA77',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ota: {
    fontSize: 22,
    fontWeight: '800',
    color: '#007755',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});