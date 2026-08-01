import type { ExtensionTarget } from 'expo-targets';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type SharedItem = {
  id: string;
  sharedAt: string;
  content: { text?: string; url?: string };
};

type Props = {
  target: ExtensionTarget;
  text?: string;
  url?: string;
};

export default function ShareExtension({ target, text, url }: Props) {
  const save = () => {
    const existing = target.getData<{ items: SharedItem[] }>() || { items: [] };
    const item: SharedItem = {
      id: Date.now().toString(),
      sharedAt: new Date().toISOString(),
      content: { text, url },
    };
    target.setData({ items: [...(existing.items || []), item] });
    target.close();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Share</Text>
      <Text>{text || url || 'No content'}</Text>
      <TouchableOpacity style={styles.button} onPress={save}>
        <Text style={styles.buttonText}>Save</Text>
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
