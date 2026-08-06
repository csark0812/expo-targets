const RN_CAPABLE = new Set([
  'share',
  'action',
  'clip',
  'messages',
  'notification-content',
  'safari',
]);

export function isReactNativeCapableType(type: string): boolean {
  return RN_CAPABLE.has(type);
}

function toCamel(pascalName: string): string {
  return pascalName.charAt(0).toLowerCase() + pascalName.slice(1);
}

export function getReactNativeTemplate(
  type: string,
  pascalName: string
): string {
  const generic = RN_CAPABLE.has(type) ? type : 'share';
  const exportName = toCamel(pascalName);

  return `import { createTarget } from 'expo-targets';
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

export const ${exportName} = createTarget<'${generic}'>('${pascalName}', ${pascalName});
`;
}
