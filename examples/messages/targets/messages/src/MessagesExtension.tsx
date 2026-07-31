import type { MessagesExtensionTarget } from 'expo-targets';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  target: MessagesExtensionTarget;
  participantCount?: number;
};

export default function MessagesExtension({
  target,
  participantCount = 1,
}: Props) {
  const send = () => {
    target.sendMessage({
      caption: 'Hello from expo-targets',
      subcaption: 'Messages example',
    });
    const existing = target.getData<{
      messages: { id: string; caption: string; sentAt: string }[];
    }>();
    target.setData({
      messages: [
        ...(existing?.messages ?? []),
        {
          id: Date.now().toString(),
          caption: 'Hello from expo-targets',
          sentAt: new Date().toISOString(),
        },
      ],
    });
    target.requestPresentationStyle('compact');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Messages</Text>
      <Text>Participants: {participantCount}</Text>
      <TouchableOpacity
        testID="btn-send-template"
        accessibilityLabel="Send template"
        style={styles.button}
        onPress={send}
      >
        <Text style={styles.buttonText}>Send template</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
