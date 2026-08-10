import { Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import { createTarget } from 'expo-targets';

type HelloExpoUiProps = {
  message?: string;
};

/**
 * Expo-UI layout sandbox widget. The `'widget'` directive is required so
 * babel-preset-expo / expo-widgets compile this to a layout string for
 * WidgetsEntryView (not AppRegistry / full RN).
 */
function HelloExpoUiLayout(
  props: HelloExpoUiProps,
  _environment: { widgetFamily?: string }
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
        Hello Expo UI
      </Text>
      <Text modifiers={[font({ size: 13 }), foregroundStyle('#3C3C43')]}>
        {props.message ?? 'No message yet'}
      </Text>
    </VStack>
  );
}

export const helloExpoUi = createTarget('HelloExpoUi', HelloExpoUiLayout);

export const updateExpoUiMessage = (message: string) => {
  helloExpoUi.setData({ message }, { refresh: true });
};

export const getExpoUiMessage = (): string | null => {
  const data = helloExpoUi.getData<{ message?: string }>();
  return data?.message || null;
};
