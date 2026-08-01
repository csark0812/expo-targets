import type { ExtensionTarget } from 'expo-targets';
import { createTarget } from 'expo-targets';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function KsShareExtension({
  target,
  text,
  url,
}: {
  target: ExtensionTarget;
  text?: string;
  url?: string;
}) {
  const save = () => {
    const existing = target.getData<{ items: unknown[] }>() || { items: [] };
    target.setData({
      items: [...existing.items, { id: Date.now().toString(), text, url }],
    });
    target.close();
  };
  return (
    <View style={styles.box}>
      <Text>KS Share</Text>
      <Text>{text || url || 'No content'}</Text>
      <TouchableOpacity style={styles.btn} onPress={save}>
        <Text style={styles.btnText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

export const ksShareTarget = createTarget<'share'>('KsShare', KsShareExtension);

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
