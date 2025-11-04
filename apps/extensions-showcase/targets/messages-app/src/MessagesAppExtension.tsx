import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { createTarget, close } from 'expo-targets';

const messagesAppTarget = createTarget('MessagesApp');

interface MessageTemplate {
  id: string;
  caption: string;
  emoji: string;
}

const messageTemplates: MessageTemplate[] = [
  { id: '1', caption: 'Hello! 👋', emoji: '👋' },
  { id: '2', caption: 'Great job! 🎉', emoji: '🎉' },
  { id: '3', caption: 'Thanks! 🙏', emoji: '🙏' },
  { id: '4', caption: 'Happy birthday! 🎂', emoji: '🎂' },
  { id: '5', caption: 'Congratulations! 🎊', emoji: '🎊' },
  { id: '6', caption: 'See you soon! 👋', emoji: '👋' },
];

export default function MessagesAppExtension() {
  const [selectedTemplate, setSelectedTemplate] =
    useState<MessageTemplate | null>(null);

  const handleSend = () => {
    if (selectedTemplate) {
      // Store the message in app group for the main app to read
      const existingMessages = messagesAppTarget.getData<{
        messages: Array<{ id: string; caption: string; sentAt: string }>;
      }>() || { messages: [] };
      const newMessage = {
        id: Date.now().toString(),
        caption: selectedTemplate.caption,
        sentAt: new Date().toISOString(),
      };
      messagesAppTarget.setData({
        messages: [...existingMessages.messages, newMessage],
      });
    }
    close();
  };

  const handleCancel = () => {
    close();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages App</Text>
        <Text style={styles.subtitle}>Select a message template</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.templatesGrid}>
          {messageTemplates.map((template) => (
            <TouchableOpacity
              key={template.id}
              style={[
                styles.templateCard,
                selectedTemplate?.id === template.id &&
                  styles.templateCardSelected,
              ]}
              onPress={() => setSelectedTemplate(template)}
            >
              <Text style={styles.templateEmoji}>{template.emoji}</Text>
              <Text
                style={[
                  styles.templateCaption,
                  selectedTemplate?.id === template.id &&
                    styles.templateCaptionSelected,
                ]}
              >
                {template.caption}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedTemplate && (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Preview:</Text>
            <Text style={styles.previewText}>{selectedTemplate.caption}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.sendButton,
            !selectedTemplate && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!selectedTemplate}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
  templateCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  templateEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  templateCaption: {
    fontSize: 14,
    color: '#000000',
    textAlign: 'center',
  },
  templateCaptionSelected: {
    fontWeight: '600',
    color: '#007AFF',
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  previewText: {
    fontSize: 18,
    color: '#000000',
    fontWeight: '500',
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
