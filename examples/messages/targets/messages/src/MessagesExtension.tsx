import type { MessagesExtensionTarget } from "expo-targets";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

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

function appendMessage(
  target: MessagesExtensionTarget,
  caption: string,
  kind: string,
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

export default function MessagesExtension({
  target,
  participantCount = 1,
}: Props) {
  const [style, setStyle] = useState(
    () => target.getPresentationStyle() ?? "compact",
  );
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [attachmentSaved, setAttachmentSaved] = useState(false);

  useEffect(() => {
    target.requestPresentationStyle("expanded");
    setStyle("expanded");
    const sub = target.addEventListener("onPresentationStyleChange", (next) => {
      setStyle(next);
    });
    return () => sub.remove();
  }, [target]);

  const sendTemplate = () => {
    target.sendMessage({
      caption: "Hello from expo-targets",
      subcaption: "Messages example",
    });
    appendMessage(target, "Hello from expo-targets", "template");
    target.requestPresentationStyle("compact");
  };

  const sendSession = () => {
    const id = sessionId ?? target.createSession() ?? `session-${Date.now()}`;
    setSessionId(id);
    target.sendUpdate(
      {
        caption: "Session bubble from expo-targets",
        subcaption: `session:${id.slice(0, 8)}`,
        url: `expotargets://messages/session/${id}`,
      },
      id,
    );
    appendMessage(target, "Session bubble from expo-targets", "session");
  };

  const insertAttachment = () => {
    const marker = "expo-targets messages attachment";
    // Persist before native insert — host launch tears down the extension
    // before a deferred appendMessage after await would run.
    appendMessage(target, marker, "attachment");
    setAttachmentSaved(true);
    void target
      .insertAttachment({
        filename: "expo-targets-note.txt",
        contents: marker,
      })
      .catch(() => {
        /* native insert best-effort; App Group already recorded the action */
      });
  };

  const expand = () => {
    target.requestPresentationStyle("expanded");
    setStyle("expanded");
  };

  const compact = () => {
    target.requestPresentationStyle("compact");
    setStyle("compact");
  };

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

      <TouchableOpacity
        testID="btn-expand"
        accessibilityLabel="Expand"
        style={styles.button}
        onPress={expand}
      >
        <Text style={styles.buttonText}>Expand</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-compact"
        accessibilityLabel="Compact"
        style={styles.buttonSecondary}
        onPress={compact}
      >
        <Text style={styles.buttonText}>Compact</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-send-session"
        accessibilityLabel="Send session"
        style={styles.button}
        onPress={sendSession}
      >
        <Text style={styles.buttonText}>Send session</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-insert-attachment"
        accessibilityLabel="Insert attachment"
        style={styles.button}
        onPress={insertAttachment}
      >
        <Text style={styles.buttonText}>Insert attachment</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-send-template"
        accessibilityLabel="Send template"
        style={styles.button}
        onPress={sendTemplate}
      >
        <Text style={styles.buttonText}>Send template</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 10, justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "700" },
  button: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonSecondary: {
    backgroundColor: "#5856D6",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
