import { Button, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import {
  createLiveActivityLayout,
  createTarget,
} from 'expo-targets';

type HelloExpoUiProps = {
  message?: string;
  taps?: number;
};

type HelloExpoUiEnv = {
  widgetFamily?: string;
  configuration?: { listId?: string };
};

/**
 * Expo-UI layout sandbox widget. The `'widget'` directive is required so
 * babel-preset-expo / expo-widgets compile this to a layout string for
 * WidgetsEntryView (not AppRegistry / full RN).
 *
 * Button onPress may return next props (timeline merge). Edit Widget
 * `listId` arrives via environment.configuration when ios.configuration is set.
 */
function HelloExpoUiLayout(props: HelloExpoUiProps, environment: HelloExpoUiEnv) {
  'widget';
  const taps = props.taps ?? 0;
  const listId = environment.configuration?.listId;
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
      {listId ? (
        <Text modifiers={[font({ size: 12 }), foregroundStyle('#8E8E93')]}>
          list:{listId}
        </Text>
      ) : null}
      <Text modifiers={[font({ size: 12 }), foregroundStyle('#8E8E93')]}>
        taps:{taps}
      </Text>
      <Button
        label="Bump"
        onPress={
          (() => ({
            message: props.message ?? 'tapped',
            taps: taps + 1,
          })) as () => void
        }
      />
    </VStack>
  );
}

type LaProps = {
  title?: string;
  status?: string;
};

function HelloExpoUiLiveActivity(
  props: LaProps,
  _environment: { isLuminanceReduced?: boolean }
) {
  'widget';
  return {
    banner: (
      <VStack>
        <Text modifiers={[font({ weight: 'bold', size: 15 })]}>
          {props.title ?? 'Expo UI LA'}
        </Text>
        <Text modifiers={[font({ size: 13 })]}>{props.status ?? 'idle'}</Text>
      </VStack>
    ),
    compactLeading: (
      <Text modifiers={[font({ size: 12 })]}>{props.status ?? '…'}</Text>
    ),
    compactTrailing: (
      <Text modifiers={[font({ size: 12 })]}>{props.title ?? 'LA'}</Text>
    ),
    minimal: <Text modifiers={[font({ size: 10 })]}>•</Text>,
  };
}

export const helloExpoUi = createTarget('HelloExpoUi', HelloExpoUiLayout);

/** Multi-slot expo-ui Live Activity (WidgetLiveActivity blob path). */
export const helloExpoUiLiveActivity = createLiveActivityLayout(
  'HelloExpoUi',
  HelloExpoUiLiveActivity
);

export const updateExpoUiMessage = (message: string) => {
  helloExpoUi.setData({ message, taps: 0 }, { refresh: true });
};

export const getExpoUiMessage = (): string | null => {
  const data = helloExpoUi.getData<{ message?: string }>();
  return data?.message || null;
};
