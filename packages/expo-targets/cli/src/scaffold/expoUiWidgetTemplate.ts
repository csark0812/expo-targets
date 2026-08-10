function toCamel(pascalName: string): string {
  return pascalName.charAt(0).toLowerCase() + pascalName.slice(1);
}

/** Expo-ui widget Layout entry (`'widget'` directive + createTarget). */
export function getExpoUiWidgetTemplate(pascalName: string): string {
  const exportName = toCamel(pascalName);
  return `import { Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import { createTarget } from 'expo-targets';

type ${pascalName}Props = {
  message?: string;
};

/**
 * Expo-UI layout sandbox widget. The \`'widget'\` directive is required so
 * babel-preset-expo / expo-widgets compile this to a layout string for
 * WidgetsEntryView (not AppRegistry / full RN).
 */
function ${pascalName}Layout(
  props: ${pascalName}Props,
  _environment: { widgetFamily?: string; configuration?: Record<string, unknown> }
) {
  'widget';
  return (
    <VStack>
      <Text
        modifiers={[
          font({ weight: 'bold', size: 15 }),
          foregroundStyle('#000000'),
        ]}
      >
        ${pascalName}
      </Text>
      <Text modifiers={[font({ size: 13 }), foregroundStyle('#3C3C43')]}>
        {props.message ?? 'No message yet'}
      </Text>
    </VStack>
  );
}

export const ${exportName} = createTarget('${pascalName}', ${pascalName}Layout);
`;
}
