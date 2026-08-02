import type { ExtensionTarget } from 'expo-targets';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type ProcessedItem = {
  id: string;
  processedAt: string;
  filter: string;
};

type Props = {
  target: ExtensionTarget;
  images?: string[];
};

export default function ActionExtension({ target, images }: Props) {
  const save = () => {
    const existing = target.getData<{ items: ProcessedItem[] }>() || {
      items: [],
    };
    const item: ProcessedItem = {
      id: Date.now().toString(),
      processedAt: new Date().toISOString(),
      filter: 'grayscale',
    };
    target.setData({ items: [...(existing.items || []), item] });
    target.close();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Action</Text>
      <Text>Images: {images?.length ?? 0}</Text>
      <TouchableOpacity style={styles.button} onPress={save}>
        <Text style={styles.buttonText}>Process</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => target.close()}>
        <Text>Cancel</Text>
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
