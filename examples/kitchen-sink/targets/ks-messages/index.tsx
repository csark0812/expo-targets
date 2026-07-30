import type { MessagesExtensionTarget } from 'expo-targets';
import { createTarget } from 'expo-targets';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function KsMessagesExtension({ target }: { target: MessagesExtensionTarget }) {
  const send = () => {
    target.sendMessage({ caption: 'KS hello', subcaption: 'kitchen sink' });
    const existing = target.getData<{ messages: unknown[] }>();
    target.setData({
      messages: [
        ...(existing?.messages ?? []),
        {
          id: Date.now().toString(),
          caption: 'KS hello',
          sentAt: new Date().toISOString(),
        },
      ],
    });
  };
  return (
    <View style={styles.box}>
      <Text>KS Messages</Text>
      <TouchableOpacity style={styles.btn} onPress={send}>
        <Text style={styles.btnText}>Send</Text>
      </TouchableOpacity>
    </View>
  );
}

export const ksMessagesTarget = createTarget<'messages'>(
  'KsMessages',
  KsMessagesExtension
);

const styles = StyleSheet.create({
  box: { flex: 1, padding: 20, gap: 12, justifyContent: 'center' },
  btn: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
});
