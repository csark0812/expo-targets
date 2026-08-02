import { StyleSheet, Text, View } from 'react-native';

export default function SafariExtension() {
  return (
    <View style={styles.root} testID="safari-rn-root">
      <Text style={styles.title} testID="safari-rn-title">
        Safari RN Web
      </Text>
      <Text style={styles.marker} testID="safari-rn-marker">
        expo-targets uitest safari rn
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 12, backgroundColor: '#fff' },
  title: { fontSize: 16, fontWeight: '600' },
  marker: { fontSize: 13, color: '#666', marginTop: 8 },
});
