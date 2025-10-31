import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { rnShareTarget } from './targets/rn-share';

interface SharedItem {
  type: string;
  content: string;
  timestamp: number;
}

export default function App() {
  const [sharedItems, setSharedItems] = useState<SharedItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSharedItems();
  }, []);

  const loadSharedItems = async () => {
    setRefreshing(true);
    try {
      const data = rnShareTarget.getData<{
        sharedAt?: string;
        content?: {
          text?: string;
          url?: string;
          images?: string[];
          files?: string[];
        };
      }>();

      const items: SharedItem[] = [];

      if (data.content) {
        const timestamp = data.sharedAt
          ? new Date(data.sharedAt).getTime()
          : Date.now();

        if (data.content.text) {
          items.push({
            type: 'text',
            content: data.content.text,
            timestamp,
          });
        }

        if (data.content.url) {
          items.push({
            type: 'url',
            content: data.content.url,
            timestamp,
          });
        }

        if (data.content.images?.length) {
          data.content.images.forEach((image) => {
            items.push({
              type: 'image',
              content: image,
              timestamp,
            });
          });
        }

        if (data.content.files?.length) {
          data.content.files.forEach((file) => {
            items.push({
              type: 'file',
              content: file,
              timestamp,
            });
          });
        }
      }

      setSharedItems(items);
    } catch (error) {
      console.error('Failed to load shared items:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleClear = async () => {
    Alert.alert(
      'Clear All',
      'Are you sure you want to clear all shared items?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              rnShareTarget.storage.clear();
              setSharedItems([]);
            } catch (error) {
              console.error('Failed to clear shared items:', error);
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text':
        return '📝';
      case 'url':
        return '🔗';
      case 'image':
        return '🖼️';
      default:
        return '📄';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      <ScrollView style={styles.content}>
        <Text style={styles.title}>📤 Share Extension</Text>
        <Text style={styles.subtitle}>Share content from other apps</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>How to Use</Text>
          </View>
          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>Open Safari, Photos, or any app</Text>
          </View>
          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>Tap the Share button</Text>
          </View>
          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>Select "Share Extension"</Text>
          </View>
          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>4</Text>
            <Text style={styles.stepText}>Content appears here!</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              Shared Items ({sharedItems.length})
            </Text>
            {sharedItems.length > 0 && (
              <TouchableOpacity onPress={handleClear}>
                <Text style={styles.clearButton}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {sharedItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyText}>No shared items yet</Text>
              <Text style={styles.emptySubtext}>
                Share something from another app to see it here
              </Text>
            </View>
          ) : (
            <View>
              {sharedItems.map((item, index) => (
                <View key={index} style={styles.sharedItem}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemIcon}>
                      {getTypeIcon(item.type)}
                    </Text>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemType}>
                        {item.type.toUpperCase()}
                      </Text>
                      <Text style={styles.itemDate}>
                        {formatDate(item.timestamp)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.itemContent} numberOfLines={3}>
                    {item.content}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadSharedItems}
            disabled={refreshing}
          >
            <Text style={styles.refreshButtonText}>
              {refreshing ? 'Refreshing...' : '🔄 Refresh'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoEmoji}>💡</Text>
          <Text style={styles.infoText}>
            Share extensions let you process content from other apps. Perfect
            for saving articles, bookmarks, or media!
          </Text>
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  clearButton: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    backgroundColor: '#007AFF',
    borderRadius: 14,
    color: 'white',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: 'bold',
    marginRight: 12,
  },
  stepText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  sharedItem: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 2,
  },
  itemDate: {
    fontSize: 11,
    color: '#666',
  },
  itemContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
});
