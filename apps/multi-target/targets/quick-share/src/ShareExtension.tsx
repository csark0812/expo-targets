import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { quickShareTarget } from '../index';

interface SharedData {
  text?: string;
  url?: string;
  images?: string[];
  files?: string[];
  preprocessedWebData?: any;
}

interface ShareExtensionProps extends SharedData {
  // Props are automatically passed by the native Swift side
  // They contain all shared content from the share sheet
}

/**
 * ShareExtension demonstrates TWO ways to access shared data:
 *
 * 1. Via Props (Recommended) - Data is automatically passed from native side
 *    More efficient, no async operations needed
 *
 * 2. Via getSharedData() - Programmatic access to the same data
 *    Useful for dynamic access or when props aren't available
 */
export default function ShareExtension(props: ShareExtensionProps) {
  const [dataFromAPI, setDataFromAPI] = useState<SharedData | null>(null);

  // METHOD 1: Access via Props (passed automatically from native)
  const dataFromProps: SharedData = {
    text: props.text,
    url: props.url,
    images: props.images,
    files: props.files,
    preprocessedWebData: props.preprocessedWebData,
  };

  // METHOD 2: Access via getSharedData() API
  useEffect(() => {
    const sharedData = quickShareTarget.getSharedData?.();
    setDataFromAPI(sharedData || null);

    // Demonstrate both methods return the same data
    console.log('Data from props:', dataFromProps);
    console.log('Data from getSharedData():', sharedData);
  }, []);

  // Use props data as primary source (more efficient)
  const data = dataFromProps;

  const handleSave = () => {
    if (data.text || data.url || data.images?.length) {
      quickShareTarget.setData({
        sharedAt: new Date().toISOString(),
        content: data,
      });
    }
    quickShareTarget.close?.();
  };

  const handleCancel = () => {
    quickShareTarget.close?.();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quick Share</Text>
        <Text style={styles.subtitle}>Share to Multi-Target App</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Debug section showing both data access methods work */}
        <View style={styles.debugSection}>
          <Text style={styles.debugTitle}>📋 Data Access Methods Demo</Text>
          <View style={styles.debugCard}>
            <Text style={styles.debugLabel}>✅ Via Props (Recommended):</Text>
            <Text style={styles.debugText}>
              {JSON.stringify(dataFromProps, null, 2)}
            </Text>
          </View>
          <View style={styles.debugCard}>
            <Text style={styles.debugLabel}>✅ Via getSharedData():</Text>
            <Text style={styles.debugText}>
              {JSON.stringify(dataFromAPI, null, 2)}
            </Text>
          </View>
          <Text style={styles.debugNote}>
            Both methods provide the same data. Props are more efficient.
          </Text>
        </View>

        {data?.text && (
          <View style={styles.section}>
            <Text style={styles.label}>Text</Text>
            <View style={styles.card}>
              <Text style={styles.text}>{data.text}</Text>
            </View>
          </View>
        )}

        {data?.url && (
          <View style={styles.section}>
            <Text style={styles.label}>URL</Text>
            <View style={styles.card}>
              <Text style={styles.url}>{data.url}</Text>
            </View>
          </View>
        )}

        {data.images && data.images.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Images ({data.images.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {data.images.map((imageUrl: string, index: number) => (
                <View key={index} style={styles.imageContainer}>
                  <Image source={{ uri: imageUrl }} style={styles.image} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {data.files && data.files.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Files ({data.files.length})</Text>
            {data.files.map((fileUrl: string, index: number) => (
              <View key={index} style={styles.card}>
                <Text style={styles.text} numberOfLines={1}>
                  {fileUrl.split('/').pop() || fileUrl}
                </Text>
              </View>
            ))}
          </View>
        )}

        {!data.text &&
          !data.url &&
          !data.images?.length &&
          !data.files?.length && (
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
  debugSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
  },
  debugCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  debugLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 6,
  },
  debugText: {
    fontSize: 11,
    fontFamily: 'Courier',
    color: '#000000',
  },
  debugNote: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
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
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
