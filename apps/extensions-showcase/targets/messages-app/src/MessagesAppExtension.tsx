import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import {
  createTarget,
  sendMessage,
  requestPresentationStyle,
  addMessagesEventListener,
  close,
  type PresentationStyle,
  type SelectedMessage,
} from 'expo-targets';

interface MessagesAppProps {
  presentationStyle: PresentationStyle;
  conversationId: string;
  participantCount: number;
  hasSelectedMessage: boolean;
  selectedMessage?: SelectedMessage;
  remoteParticipantIds: string[];
}

const messagesTarget = createTarget('MessagesApp');

interface MessageTemplate {
  id: string;
  caption: string;
  subcaption: string;
  emoji: string;
  image: string; // SF Symbol
}

const templates: MessageTemplate[] = [
  {
    id: '1',
    caption: 'Hello!',
    subcaption: 'Send a greeting',
    emoji: '👋',
    image: 'hand.wave.fill',
  },
  {
    id: '2',
    caption: 'Great job!',
    subcaption: 'Celebrate success',
    emoji: '🎉',
    image: 'party.popper.fill',
  },
  {
    id: '3',
    caption: 'Thanks!',
    subcaption: 'Show appreciation',
    emoji: '🙏',
    image: 'hands.sparkles.fill',
  },
  {
    id: '4',
    caption: 'See you soon!',
    subcaption: 'Say goodbye',
    emoji: '👋',
    image: 'figure.wave',
  },
];

export default function MessagesAppExtension(props: MessagesAppProps) {
  const [presentationStyle, setPresentationStyle] = useState<PresentationStyle>(
    props.presentationStyle
  );
  const [customMessage, setCustomMessage] = useState('');

  useEffect(() => {
    // Listen for presentation style changes
    const subscription = addMessagesEventListener(
      'onPresentationStyleChange',
      (style: PresentationStyle) => {
        setPresentationStyle(style);
      }
    );

    return () => subscription.remove();
  }, []);

  const handleTextFocus = () => {
    if (presentationStyle === 'compact') {
      requestPresentationStyle('expanded');
    }
  };

  const handleSendTemplate = (template: MessageTemplate) => {
    sendMessage({
      caption: template.caption,
      subcaption: template.subcaption,
      trailingSubcaption: `To ${props.participantCount} people`,
      imageUrl: template.image,
      url: `expo-targets://message?type=template&id=${template.id}`,
    });

    // Store in App Group
    const existing = messagesTarget.getData<{ messages: any[] }>() || {
      messages: [],
    };
    messagesTarget.setData({
      messages: [
        ...existing.messages,
        {
          id: Date.now().toString(),
          caption: template.caption,
          sentAt: new Date().toISOString(),
        },
      ],
    });

    close();
  };

  const handleSendCustom = () => {
    if (!customMessage.trim()) return;

    sendMessage({
      caption: customMessage,
      subcaption: 'Custom message',
      url: `expo-targets://message?type=custom`,
    });

    close();
  };

  // Compact mode - show condensed UI
  if (presentationStyle === 'compact') {
    return (
      <View style={styles.compactContainer}>
        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => requestPresentationStyle('expanded')}
        >
          <Text style={styles.expandButtonText}>Tap to compose message ✨</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Expanded mode - full UI
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages App</Text>
        <Text style={styles.subtitle}>
          {props.hasSelectedMessage
            ? 'Reply to message'
            : `Send to ${props.participantCount} people`}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {props.hasSelectedMessage && props.selectedMessage && (
          <View style={styles.replyCard}>
            <Text style={styles.replyLabel}>Replying to:</Text>
            <Text style={styles.replyCaption}>
              {props.selectedMessage.caption}
            </Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>Templates</Text>
        <View style={styles.templateGrid}>
          {templates.map((template) => (
            <TouchableOpacity
              key={template.id}
              style={styles.templateCard}
              onPress={() => handleSendTemplate(template)}
            >
              <Text style={styles.templateEmoji}>{template.emoji}</Text>
              <Text style={styles.templateCaption}>{template.caption}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Custom Message</Text>
        <TextInput
          style={styles.textInput}
          value={customMessage}
          onChangeText={setCustomMessage}
          onFocus={handleTextFocus}
          placeholder="Type your message..."
          multiline
        />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => close()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.sendButton,
            !customMessage.trim() && styles.sendButtonDisabled,
          ]}
          onPress={handleSendCustom}
          disabled={!customMessage.trim()}
        >
          <Text style={styles.sendButtonText}>Send Custom</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  compactContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    padding: 20,
  },
  expandButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  expandButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  replyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  replyCaption: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 8,
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  templateCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  templateEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  templateCaption: {
    fontSize: 14,
    color: '#000000',
    textAlign: 'center',
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    minHeight: 80,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  sendButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
