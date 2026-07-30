import type { ExtensionTarget } from 'expo-targets';
import { createTarget } from 'expo-targets';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function KsClipExtension({ target }: { target: ExtensionTarget }) {
  const checkout = () => {
    target.setData({
      itemName: 'KS Clip item',
      price: '$3.00',
      timestamp: Date.now(),
    });
    target.openHostApp?.();
  };
  return (
    <View style={styles.box}>
      <Text>KS Clip</Text>
      <TouchableOpacity style={styles.btn} onPress={checkout}>
        <Text style={styles.btnText}>Checkout</Text>
      </TouchableOpacity>
    </View>
  );
}

export const ksClipTarget = createTarget<'clip'>('KsClip', KsClipExtension);

const styles = StyleSheet.create({
  box: { flex: 1, padding: 20, gap: 12, justifyContent: 'center' },
  btn: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
});
