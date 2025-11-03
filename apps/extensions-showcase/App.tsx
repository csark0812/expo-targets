import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { shareContentTarget } from './targets/share-content';
import { imageActionTarget } from './targets/image-action';
import type { SharedItem } from './targets/share-content/src/ShareExtension';
import type { ProcessedItem } from './targets/image-action/src/ImageActionExtension';

export default function App() {
  const [sharedItems, setSharedItems] = useState<SharedItem[]>([]);
  const [processedItems, setProcessedItems] = useState<ProcessedItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const shareData = shareContentTarget.getData<{ items: SharedItem[] }>();
    if (shareData?.items) {
      setSharedItems(shareData.items);
    }

    const actionData = imageActionTarget.getData<{ items: ProcessedItem[] }>();
    if (actionData?.items) {
      setProcessedItems(actionData.items);
    }
  };

  const clearSharedItems = () => {
    shareContentTarget.setData({ items: [] });
    setSharedItems([]);
  };

  const clearProcessedItems = () => {
    imageActionTarget.setData({ items: [] });
    setProcessedItems([]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      <ScrollView style={styles.content}>
        <Text style={styles.title}>📤 Extensions Showcase</Text>
        <Text style={styles.subtitle}>
          Share and Action Extensions with React Native
        </Text>

        {/* Share Extension Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📤 Share Extension</Text>
          <Text style={styles.description}>
            Share content from other apps (Safari, Photos, etc.) to this app.
            Supports text, URLs, and images.
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>How to use:</Text>
            <Text style={styles.infoText}>
              1. Open Safari or Photos{'\n'}
              2. Tap the Share button{'\n'}
              3. Select "Share Content"{'\n'}
              4. Tap "Save"
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{sharedItems.length}</Text>
              <Text style={styles.statLabel}>Items Shared</Text>
            </View>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearSharedItems}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Shared Items List */}
        {sharedItems.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Shared Items</Text>
            {sharedItems
              .slice()
              .reverse()
              .map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemDate}>
                      {formatDate(item.sharedAt)}
                    </Text>
                  </View>

                  {item.content.text && (
                    <View style={styles.itemSection}>
                      <Text style={styles.itemLabel}>Text:</Text>
                      <Text style={styles.itemText}>{item.content.text}</Text>
                    </View>
                  )}

                  {item.content.url && (
                    <View style={styles.itemSection}>
                      <Text style={styles.itemLabel}>URL:</Text>
                      <Text style={styles.itemUrl}>{item.content.url}</Text>
                    </View>
                  )}

                  {item.content.images && item.content.images.length > 0 && (
                    <View style={styles.itemSection}>
                      <Text style={styles.itemLabel}>
                        Images ({item.content.images.length}):
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                      >
                        {item.content.images.map((imageUrl, index) => (
                          <Image
                            key={index}
                            source={{ uri: imageUrl }}
                            style={styles.itemImage}
                          />
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              ))}
          </View>
        )}

        {/* Action Extension Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎨 Action Extension</Text>
          <Text style={styles.description}>
            Process images from Photos app with filters. Select an image and
            apply transformations.
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>How to use:</Text>
            <Text style={styles.infoText}>
              1. Open Photos app{'\n'}
              2. Select an image{'\n'}
              3. Tap Share → "Image Action"{'\n'}
              4. Choose a filter and tap "Process"
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{processedItems.length}</Text>
              <Text style={styles.statLabel}>Images Processed</Text>
            </View>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearProcessedItems}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Processed Items List */}
        {processedItems.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Processed Images</Text>
            {processedItems
              .slice()
              .reverse()
              .map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemDate}>
                      {formatDate(item.processedAt)}
                    </Text>
                    <View style={styles.filterBadge}>
                      <Text style={styles.filterBadgeText}>
                        {item.filter.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Image
                    source={{ uri: item.originalImage }}
                    style={styles.processedImage}
                  />
                </View>
              ))}
          </View>
        )}

        {/* Learning Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoEmoji}>💡</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Extension Lifecycle</Text>
            <Text style={styles.infoText}>
              Both extensions use React Native for UI. They can access shared
              data via `getSharedData()`, save data using `setData()`, and close
              using `close()`. The main app reads this data to display
              shared/processed items.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 60,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  itemCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemDate: {
    fontSize: 12,
    color: '#999',
  },
  filterBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  filterBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  itemSection: {
    marginTop: 8,
  },
  itemLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  itemText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
  itemUrl: {
    fontSize: 14,
    color: '#007AFF',
    lineHeight: 20,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#E5E5EA',
  },
  processedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  infoEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
});
