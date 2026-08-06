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
  // iOS often attaches the image's file:// as `url` alongside `images` —
  // that is still an image share, not mixed. Mixed = image + real text.
  if (hasImage && hasText) return 'mixed';
  if (hasImage) return 'image';
  if (hasUrl && !hasText) return 'url';
  return 'text';
}

export default function ShareExtension({ target, text, url, images }: Props) {
  // Android launch options or iOS initialProps; fall back to native getSharedData.
  const shared = target.getSharedData?.() ?? null;
  const resolvedText = text ?? shared?.text;
  const resolvedUrl = url ?? shared?.url;
  const resolvedImages = images ?? shared?.images;

  const save = () => {
    const existing = target.getData<{ items: SharedItem[] }>() || { items: [] };
    const kind = resolveKind(resolvedText, resolvedUrl, resolvedImages);
    const item: SharedItem = {
      id: Date.now().toString(),
      sharedAt: new Date().toISOString(),
      kind,
      content: {
        text: resolvedText,
        url: resolvedUrl,
        images: resolvedImages,
        imageCount: resolvedImages?.length ?? 0,
      },
    };
    target.setData({ items: [...(existing.items || []), item] });
    target.close();
  };

  const imageCount = resolvedImages?.length ?? 0;

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Share extension</Text>
      <Text style={styles.title}>Share</Text>
      <Text style={styles.hint}>
        Same TS entry on iOS and Android. This sheet is not the main app. Save
        writes to the app group then closes — it does not open the host by
        itself.
      </Text>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Shared content</Text>
        <Text style={styles.payload}>
          {imageCount > 0
            ? `Images: ${imageCount}`
            : resolvedText || resolvedUrl || 'No content'}
        </Text>
        <Text testID="share-kind-label" style={styles.kind}>
          kind:{resolveKind(resolvedText, resolvedUrl, resolvedImages)}
        </Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={save}>
        <Text style={styles.buttonText}>Save</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondary}
        onPress={() => target.openHostApp('/')}
      >
        <Text style={styles.secondaryText}>Open main app</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.cancel} onPress={() => target.close()}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  eyebrow: { fontSize: 12, fontWeight: '700', color: '#007AFF' },
  title: { fontSize: 22, fontWeight: '700', color: '#111' },
  hint: { fontSize: 12, color: '#666', lineHeight: 17 },
  card: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
  },
  payload: { fontSize: 16, color: '#111' },
  kind: { fontSize: 12, color: '#666', marginTop: 4 },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  secondary: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#007AFF',
  },
  secondaryText: { color: '#007AFF', fontWeight: '600' },
  cancel: { padding: 12, alignItems: 'center' },
  cancelText: { color: '#666', fontSize: 16 },
});
