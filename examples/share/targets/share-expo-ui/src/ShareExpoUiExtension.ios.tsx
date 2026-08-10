import { Host, Button, Text, VStack } from '@expo/ui/swift-ui';
import type { ExtensionTarget } from 'expo-targets';

type Props = {
  target: ExtensionTarget;
  text?: string;
  url?: string;
};

/**
 * Host-in-RN share UI (iOS / SwiftUI via @expo/ui).
 */
export default function ShareExpoUiExtension({ target, text, url }: Props) {
  const shared = target.getSharedData?.() ?? null;
  const resolvedText = text ?? shared?.text ?? shared?.url ?? url ?? 'No content';

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
      <VStack spacing={12}>
        <Text>Share (Expo UI)</Text>
        <Text>{String(resolvedText)}</Text>
        <Button label="Save" onPress={save} />
        <Button label="Open main app" onPress={() => target.openHostApp('/')} />
        <Button label="Cancel" onPress={() => target.close()} />
      </VStack>
    </Host>
  );
}
