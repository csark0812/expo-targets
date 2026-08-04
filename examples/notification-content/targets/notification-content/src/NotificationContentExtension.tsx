import { Pressable, StyleSheet, Text, View } from 'react-native';

export type NotificationContentProps = {
  title?: string;
  body?: string;
  category?: string;
};

/**
 * RN Notification Content Extension — expand must surface ET NCE Content marker.
 * Action chips are Sim-greenable AX targets (userInteraction / media = S3a leftovers if unassertable).
 */
export default function NotificationContentExtension({
  title,
  body,
  category,
}: NotificationContentProps) {
  return (
    <View style={styles.root} testID="nce-rn-root">
      <Text style={styles.title} testID="nce-rn-title">
        {title ?? 'Notification'}
      </Text>
      <Text style={styles.body} testID="nce-rn-body">
        {body ?? ''}
      </Text>
      <Text
        style={styles.marker}
        testID="nce-rn-marker"
        accessibilityLabel="ET NCE Content"
      >
        ET NCE Content
      </Text>
      <View style={styles.actions} testID="nce-rn-actions">
        <Pressable
          testID="nce-action-ack"
          accessibilityLabel="NCE Acknowledge"
          style={styles.chip}
        >
          <Text style={styles.chipText}>Acknowledge</Text>
        </Pressable>
        <Pressable
          testID="nce-action-open"
          accessibilityLabel="NCE Open Host"
          style={styles.chipSecondary}
        >
          <Text style={styles.chipText}>Open Host</Text>
        </Pressable>
      </View>
      {category ? (
        <Text style={styles.meta} testID="nce-rn-category">
          {category}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
    gap: 8,
  },
  title: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15 },
  marker: { fontSize: 13, color: '#666' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  chip: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  chipSecondary: {
    backgroundColor: '#5856D6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  chipText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  meta: { fontSize: 12, color: '#999', marginTop: 4 },
});
