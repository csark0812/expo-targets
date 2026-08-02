import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>ET Unwanted</Text>
      <Text testID="status-target-ready">ready</Text>
      <Text testID="text-extension-type">unwanted-communication</Text>
      <Text testID="text-bundle-suffix">
        com.expotargets.example.unwanted-communication
      </Text>
      <Text testID="btn-clear-payload">clear</Text>
      <Text testID="text-last-payload">none</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
});
