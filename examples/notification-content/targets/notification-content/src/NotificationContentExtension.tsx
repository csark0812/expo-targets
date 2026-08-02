import { StyleSheet, Text, View } from 'react-native';

export type NotificationContentProps = {
  title?: string;
  body?: string;
  category?: string;
};

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
  },
  title: { fontSize: 17, fontWeight: '600', marginBottom: 6 },
  body: { fontSize: 15, marginBottom: 8 },
  marker: { fontSize: 13, color: '#666' },
  meta: { fontSize: 12, color: '#999', marginTop: 4 },
});
