import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { imageActionTarget } from '../index';

interface ImageActionProps {
  images?: string[];
}

type FilterType = 'original' | 'grayscale' | 'sepia' | 'invert' | 'brighten';

export default function ImageActionExtension(props: ImageActionProps) {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('original');
  const [processing, setProcessing] = useState(false);
  const imageUrl = props.images?.[0];

  const filters: { type: FilterType; label: string; icon: string }[] = [
    { type: 'original', label: 'Original', icon: '🖼️' },
    { type: 'grayscale', label: 'Grayscale', icon: '⚫' },
    { type: 'sepia', label: 'Sepia', icon: '📸' },
    { type: 'invert', label: 'Invert', icon: '🔄' },
    { type: 'brighten', label: 'Brighten', icon: '✨' },
  ];

  const handleProcess = () => {
    if (!imageUrl) return;

    setProcessing(true);

    // Simulate image processing
    setTimeout(() => {
      const existingData = imageActionTarget.getData<{
        items: ProcessedItem[];
      }>() || { items: [] };
      const newItem: ProcessedItem = {
        id: Date.now().toString(),
        processedAt: new Date().toISOString(),
        originalImage: imageUrl,
        filter: selectedFilter,
      };
      const updatedItems = [...(existingData.items || []), newItem];
      imageActionTarget.setData({ items: updatedItems });

      setProcessing(false);
      imageActionTarget.close();
    }, 1000);
  };

  const handleCancel = () => {
    imageActionTarget.close();
  };

  if (!imageUrl) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No image provided</Text>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Image Action</Text>
        <Text style={styles.subtitle}>Apply filters to image</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>Image</Text>
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUrl }} style={styles.image} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Filter</Text>
          <View style={styles.filterGrid}>
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.type}
                style={[
                  styles.filterButton,
                  selectedFilter === filter.type && styles.filterButtonActive,
                ]}
                onPress={() => setSelectedFilter(filter.type)}
              >
                <Text style={styles.filterIcon}>{filter.icon}</Text>
                <Text
                  style={[
                    styles.filterLabel,
                    selectedFilter === filter.type && styles.filterLabelActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 This is a demo. In a real app, you would apply actual image
            filters using a library like react-native-image-manipulator or
            expo-image-manipulator.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.processButton,
            processing && styles.processButtonDisabled,
          ]}
          onPress={handleProcess}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.processButtonText}>Process</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export interface ProcessedItem {
  id: string;
  processedAt: string;
  originalImage: string;
  filter: FilterType;
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
  imageContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  filterButton: {
    flex: 1,
    minWidth: '30%',
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
  filterButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  filterIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  filterLabelActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 20,
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
  processButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  processButtonDisabled: {
    opacity: 0.6,
  },
  processButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
