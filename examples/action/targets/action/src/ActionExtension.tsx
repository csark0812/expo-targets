import type { ExtensionTarget } from 'expo-targets';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type ProcessedItem = {
  id: string;
  processedAt: string;
  filter: string;
  /** Distinguishes image path for host payload asserts. */
  kind: 'image';
  imageCount: number;
  /** Multi-item flag when activation delivered more than one image. */
  multiItem: boolean;
};

type Props = {
  target: ExtensionTarget;
  images?: string[];
};

export default function ActionExtension({ target, images }: Props) {
  const imageCount = images?.length ?? 0;
  const didAutoProcess = useRef(false);

  const save = () => {
    if (didAutoProcess.current) return;
    didAutoProcess.current = true;
    const existing = target.getData<{ items: ProcessedItem[] }>() || {
      items: [],
    };
    const item: ProcessedItem = {
      id: Date.now().toString(),
      processedAt: new Date().toISOString(),
      filter: 'grayscale',
      kind: 'image',
      imageCount,
      multiItem: imageCount > 1,
    };
    target.setData({ items: [...(existing.items || []), item] });
    target.close();
  };

  // idb taps on iOS 26 action sheets fall through (AX ≠ UITouch) — same
  // as native-action. Auto-write App Group + dismiss keeps C1 honest.
  useEffect(() => {
    const t = setTimeout(save, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Action</Text>
      <Text>Images: {imageCount}</Text>
      <Text testID="action-kind-label">kind:image</Text>
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
