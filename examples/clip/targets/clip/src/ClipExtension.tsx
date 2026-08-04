import type { ExtensionTarget } from 'expo-targets';
import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  target: ExtensionTarget;
};

export default function ClipExtension({ target }: Props) {
  useEffect(() => {
    // Real App Clip launch path: write invocation marker on appear.
    const existing = target.getData<{ itemName?: string }>() || {};
    if (!existing.itemName) {
      target.setData({
        itemName: 'Clip invocation',
        price: '$0.00',
        timestamp: Date.now(),
        invoked: true,
        invocationPath: 'clip-launch',
      });
    }
  }, [target]);

  const checkout = () => {
    target.setData({
      itemName: 'Clip checkout',
      price: '$12.00',
      timestamp: Date.now(),
      invoked: true,
      invocationPath: 'clip-checkout',
    });
    target.openHostApp?.('/checkout');
  };

  return (
    <View
      style={[styles.container, { backgroundColor: '#fff' }]}
      testID="clip-rn-root"
    >
      <Text style={styles.title} testID="clip-rn-title">
        App Clip
      </Text>
      <Text testID="clip-invocation-marker" style={styles.marker}>
        expo-targets uitest clip invocation
      </Text>
      <Text style={styles.body}>Quick checkout from React Native</Text>
      <TouchableOpacity style={styles.button} onPress={checkout}>
        <Text style={styles.buttonText}>Complete checkout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#111' },
  marker: { color: '#111' },
  body: { color: '#333' },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
