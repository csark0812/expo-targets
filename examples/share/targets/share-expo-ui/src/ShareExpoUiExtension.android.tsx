import { Button, Column, Host, Text } from '@expo/ui/jetpack-compose';
import { testID } from '@expo/ui/jetpack-compose/modifiers';
import { createTarget, type ExtensionTarget } from 'expo-targets';

const primaryShareTarget = createTarget<'share'>('Share');

type Props = {
  target: ExtensionTarget;
  text?: string;
  url?: string;
};

/**
 * Host-in-RN share UI (Android / Jetpack Compose via @expo/ui).
 */
export default function ShareExpoUiExtension({ target, text, url }: Props) {
  const shared = target.getSharedData?.() ?? null;
  const resolvedText =
    text ?? shared?.text ?? shared?.url ?? url ?? 'No content';

  const save = () => {
    const existing = primaryShareTarget.getData<{ items: unknown[] }>() || {
      items: [],
    };
    const payload = {
      items: [
        ...(existing.items || []),
        {
          id: Date.now().toString(),
          sharedAt: new Date().toISOString(),
          kind: 'text',
          content: { text: String(resolvedText) },
        },
      ],
    };
    // Android's resolver groups the two activities under one application tile
    // and may route that tile to this Expo UI variant. Mirror the accepted
    // payload to the primary target that the host's evidence surface displays.
    target.setData(payload);
    primaryShareTarget.setData(payload);
    target.close();
  };

  return (
    <Host style={{ flex: 1 }}>
      <Column verticalArrangement={{ spacedBy: 12 }}>
        <Text>Share (Expo UI)</Text>
        <Text>{String(resolvedText)}</Text>
        <Button modifiers={[testID('share-expoui-save')]} onClick={save}>
          Save
        </Button>
        <Button
          modifiers={[testID('share-expoui-open-main')]}
          onClick={() => target.openHostApp('/')}
        >
          Open main app
        </Button>
        <Button
          modifiers={[testID('share-expoui-cancel')]}
          onClick={() => target.close()}
        >
          Cancel
        </Button>
      </Column>
    </Host>
  );
}
