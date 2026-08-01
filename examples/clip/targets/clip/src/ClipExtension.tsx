import type { ExtensionTarget } from 'expo-targets';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  target: ExtensionTarget;
};

export default function ClipExtension({ target }: Props) {
  const checkout = () => {
    target.setData({
      itemName: 'Clip checkout',
      price: '$12.00',
      timestamp: Date.now(),
    });
    target.openHostApp?.('/checkout');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>App Clip</Text>
      <Text>Quick checkout from React Native</Text>
      <TouchableOpacity style={styles.button} onPress={checkout}>
        <Text style={styles.buttonText}>Complete checkout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
