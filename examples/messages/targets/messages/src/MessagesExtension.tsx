import type { MessagesExtensionTarget } from 'expo-targets';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  target: MessagesExtensionTarget;
  participantCount?: number;
};

type StoredMessage = {
  id: string;
  caption: string;
  kind: string;
  sentAt: string;
};

type ExtensionButtonProps = {
  testID: string;
  accessibilityLabel: string;
  label: string;
  style: object;
  onPress: () => void;
};

function ExtensionButton({
  testID,
  accessibilityLabel,
  label,
  style,
  onPress,
}: ExtensionButtonProps) {
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      style={style}
      onPress={onPress}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

function appendMessage(
  target: MessagesExtensionTarget,
  caption: string,
  kind: string
) {
  const next: StoredMessage = {
    id: `${Date.now()}-${kind}`,
    caption,
    kind,
    sentAt: new Date().toISOString(),
  };
  // App Group reads can lag a prior setData — merge with retry so a later
  // append (template) cannot drop session/attachment entries.
  for (let i = 0; i < 4; i++) {
    const existing = target.getData<{ messages: StoredMessage[] }>();
    const messages = [...(existing?.messages ?? []), next];
    target.setData({ messages });
    const verify = target.getData<{ messages: StoredMessage[] }>();
    if (verify?.messages?.some((m) => m.id === next.id || m.kind === kind)) {
      return;
    }
  }
}

function usePresentationStyle(target: MessagesExtensionTarget) {
  const [style, setStyle] = useState(
    () => target.getPresentationStyle() ?? 'compact'
  );

  useEffect(() => {
    target.requestPresentationStyle('expanded');
    setStyle('expanded');
    const sub = target.addEventListener('onPresentationStyleChange', (next) => {
      setStyle(next);
    });
    return () => sub.remove();
  }, [target]);

  const expand = () => {
    target.requestPresentationStyle('expanded');
    setStyle('expanded');
  };

  const compact = () => {
    target.requestPresentationStyle('compact');
    setStyle('compact');
  };

  return { style, expand, compact };
}

function useMessagesActions(target: MessagesExtensionTarget) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [attachmentSaved, setAttachmentSaved] = useState(false);

  const sendTemplate = () => {
    target.sendMessage({
      caption: 'Hello from expo-targets',
      subcaption: 'Messages example',
    });
    appendMessage(target, 'Hello from expo-targets', 'template');
    target.requestPresentationStyle('compact');
  };

  const sendSession = () => {
    const id = sessionId ?? target.createSession() ?? `session-${Date.now()}`;
    setSessionId(id);
    target.sendUpdate(
      {
        caption: 'Session bubble from expo-targets',
        subcaption: `session:${id.slice(0, 8)}`,
        url: `expotargets://messages/session/${id}`,
      },
      id
    );
    appendMessage(target, 'Session bubble from expo-targets', 'session');
  };

  const insertAttachment = () => {
    const marker = 'expo-targets messages attachment';
    // Persist before native insert — host launch tears down the extension
    // before a deferred appendMessage after await would run.
    appendMessage(target, marker, 'attachment');
    setAttachmentSaved(true);
    void target
      .insertAttachment({
        filename: 'expo-targets-note.txt',
        contents: marker,
      })
      .catch(() => {
        /* native insert best-effort; App Group already recorded the action */
      });
  };

  return {
    sessionId,
    attachmentSaved,
    sendTemplate,
    sendSession,
    insertAttachment,
  };
}

type MessagesExtensionViewProps = {
  participantCount: number;
  style: string;
  sessionId: string | null;
  attachmentSaved: boolean;
  onExpand: () => void;
  onCompact: () => void;
  onSendSession: () => void;
  onInsertAttachment: () => void;
  onSendTemplate: () => void;
};

function MessagesExtensionView({
  participantCount,
  style,
  sessionId,
  attachmentSaved,
  onExpand,
  onCompact,
  onSendSession,
  onInsertAttachment,
  onSendTemplate,
}: MessagesExtensionViewProps) {
  return (
    <View style={styles.container} testID="messages-extension-root">
      <Text style={styles.title} testID="text-messages-title">
        Messages
      </Text>
      <Text testID="text-participant-count">
        Participants: {participantCount}
      </Text>
      <Text testID="text-presentation-style">style:{style}</Text>
      {sessionId ? (
        <Text testID="text-session-id">session:{sessionId.slice(0, 8)}</Text>
      ) : null}
      {attachmentSaved ? (
        <Text
          testID="text-attachment-saved"
          accessibilityLabel="attachment:saved"
        >
          attachment:saved
        </Text>
      ) : null}
      <ExtensionButton
        testID="btn-expand"
        accessibilityLabel="Expand"
        label="Expand"
        style={styles.button}
        onPress={onExpand}
      />
      <ExtensionButton
        testID="btn-compact"
        accessibilityLabel="Compact"
        label="Compact"
        style={styles.buttonSecondary}
        onPress={onCompact}
      />
      <ExtensionButton
        testID="btn-send-session"
        accessibilityLabel="Send session"
        label="Send session"
        style={styles.button}
        onPress={onSendSession}
      />
      <ExtensionButton
        testID="btn-insert-attachment"
        accessibilityLabel="Insert attachment"
        label="Insert attachment"
        style={styles.button}
        onPress={onInsertAttachment}
      />
      <ExtensionButton
        testID="btn-send-template"
        accessibilityLabel="Send template"
        label="Send template"
        style={styles.button}
        onPress={onSendTemplate}
      />
    </View>
  );
}

export default function MessagesExtension({
  target,
  participantCount = 1,
}: Props) {
  const { style, expand, compact } = usePresentationStyle(target);
  const actions = useMessagesActions(target);

  return (
    <MessagesExtensionView
      participantCount={participantCount}
      style={style}
      sessionId={actions.sessionId}
      attachmentSaved={actions.attachmentSaved}
      onExpand={expand}
      onCompact={compact}
      onSendSession={actions.sendSession}
      onInsertAttachment={actions.insertAttachment}
      onSendTemplate={actions.sendTemplate}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 10, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#5856D6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
