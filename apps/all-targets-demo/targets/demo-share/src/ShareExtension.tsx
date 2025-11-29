import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import type { ExtensionTarget } from 'expo-targets';

interface SharedData {
  text?: string;
  url?: string;
  images?: string[];
  files?: string[];
}

interface ShareExtensionProps extends SharedData {
  target: ExtensionTarget;
}

export interface SharedItem {
  id: string;
  sharedAt: string;
  content: SharedData;
}

export default function ShareExtension({
  target,
  ...props
}: ShareExtensionProps) {
  const handleSave = () => {
    if (props.text || props.url || props.images?.length) {
      const existingData = target.getData<{ items: SharedItem[] }>() || {
        items: [],
      };
      const newItem: SharedItem = {
        id: Date.now().toString(),
        sharedAt: new Date().toISOString(),
        content: props,
      };
      const updatedItems = [...(existingData.items || []), newItem];
      target.setData({ items: updatedItems });
    }
    target.close();
  };

  const handleCancel = () => {
    target.close();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Demo Share Extension</Text>
        <Text style={styles.subtitle}>Save content to app</Text>
      </View>

      <ScrollView style={styles.content}>
        {props.text && (
          <View style={styles.section}>
            <Text style={styles.label}>Text</Text>
            <View style={styles.card}>
              <Text style={styles.text}>{props.text}</Text>
            </View>
          </View>
        )}

        {props.url && (
          <View style={styles.section}>
            <Text style={styles.label}>URL</Text>
            <View style={styles.card}>
              <Text style={styles.url}>{props.url}</Text>
            </View>
          </View>
        )}

        {props.images && props.images.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Images ({props.images.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {props.images.map((imageUrl: string, index: number) => (
                <View key={index} style={styles.imageContainer}>
                  <Image source={{ uri: imageUrl }} style={styles.image} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {props.files && props.files.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Files ({props.files.length})</Text>
            {props.files.map((fileUrl: string, index: number) => (
              <View key={index} style={styles.card}>
                <Text style={styles.text} numberOfLines={1}>
                  {fileUrl.split('/').pop() || fileUrl}
                </Text>
              </View>
            ))}
          </View>
        )}

        {!props.text &&
          !props.url &&
          !props.images?.length &&
          !props.files?.length && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No content shared</Text>
            </View>
          )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save</Text>
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
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  text: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 24,
  },
  url: {
    fontSize: 14,
    color: '#007AFF',
    lineHeight: 20,
  },
  imageContainer: {
    marginRight: 12,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
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
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#34C759',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
