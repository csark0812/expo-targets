import { Button, Column, Host, Text } from '@expo/ui/jetpack-compose';
import type { ExtensionTarget } from 'expo-targets';

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
    const existing = target.getData<{ items: unknown[] }>() || { items: [] };
    target.setData({
      items: [
        ...(existing.items || []),
        {
          id: Date.now().toString(),
          sharedAt: new Date().toISOString(),
          kind: 'text',
          content: { text: String(resolvedText) },
        },
      ],
    });
    target.close();
  };

  return (
    <Host style={{ flex: 1 }}>
      <Column verticalArrangement={{ spacedBy: 12 }}>
        <Text>Share (Expo UI)</Text>
        <Text>{String(resolvedText)}</Text>
        <Button onClick={save}>Save</Button>
        <Button onClick={() => target.openHostApp('/')}>Open main app</Button>
        <Button onClick={() => target.close()}>Cancel</Button>
      </Column>
    </Host>
  );
}
