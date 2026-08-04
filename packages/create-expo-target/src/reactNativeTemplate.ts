export function getReactNativeTemplate(
  _type: string,
  pascalName: string
): string {
  return `import { AppRegistry } from 'react-native';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

function ${pascalName}() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>${pascalName}</Text>
      <Text style={styles.subtitle}>Built with React Native</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
});

// ⚠️ IMPORTANT: Component name must match the "name" field in expo-target.config.json exactly
AppRegistry.registerComponent('${pascalName}', () => ${pascalName});
`;
}
