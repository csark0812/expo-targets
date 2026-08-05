import type { ExtensionTarget } from 'expo-targets';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { OTA_LABEL } from '../otaLabel';
import { SPIKE_ENV_TAG } from '../spikeMarkers';

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
      <Text testID="share-env-tag" style={styles.meta}>
        env: {SPIKE_ENV_TAG}
      </Text>
      <Text testID="share-font-system" style={styles.systemFont}>
        font: Menlo (system)
      </Text>
      <Image
        testID="share-spike-image"
        source={require('../assets/spike.png')}
        style={styles.spikeImage}
        accessibilityLabel="spike-image"
      />
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
    gap: 10,
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
  meta: { fontSize: 13, color: '#333333' },
  systemFont: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Menlo',
    color: '#222222',
  },
  spikeImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#FFE0CC',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
