import type { ExtensionTarget } from 'expo-targets';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type SharedItem = {
  id: string;
  sharedAt: string;
  /** Distinguishes text vs image vs url for host payload asserts. */
  kind: 'text' | 'image' | 'url' | 'mixed';
  content: {
    text?: string;
    url?: string;
    images?: string[];
    imageCount?: number;
  };
};

type Props = {
  target: ExtensionTarget;
  text?: string;
  url?: string;
  images?: string[];
};

function resolveKind(
  text?: string,
  url?: string,
  images?: string[]
): SharedItem['kind'] {
  const hasImage = (images?.length ?? 0) > 0;
  const hasText = Boolean(text);
  const hasUrl = Boolean(url);
  if (hasImage && (hasText || hasUrl)) return 'mixed';
  if (hasImage) return 'image';
  if (hasUrl && !hasText) return 'url';
  return 'text';
}

export default function ShareExtension({ target, text, url, images }: Props) {
  const save = () => {
    const existing = target.getData<{ items: SharedItem[] }>() || { items: [] };
    const kind = resolveKind(text, url, images);
    const item: SharedItem = {
      id: Date.now().toString(),
      sharedAt: new Date().toISOString(),
      kind,
      content: {
        text,
        url,
        images,
        imageCount: images?.length ?? 0,
      },
    };
    target.setData({ items: [...(existing.items || []), item] });
    target.close();
  };

  const imageCount = images?.length ?? 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Share</Text>
      <Text>
        {imageCount > 0 ? `Images: ${imageCount}` : text || url || 'No content'}
      </Text>
      <Text testID="share-kind-label">
        kind:{resolveKind(text, url, images)}
      </Text>
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
