import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { AppGroupStorage } from 'expo-targets';

const storage = new AppGroupStorage('group.com.test.nativeextensionsshowcase');

interface SharedItem {
  type: string;
  content: string;
  timestamp: number;
}

interface ProcessedImage {
  filter: string;
  timestamp: number;
  imageUrl?: string;
}

export default function App() {
  const [sharedItems, setSharedItems] = useState<SharedItem[]>([]);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [lastCheckout, setLastCheckout] = useState<{
    itemName?: string;
    price?: string;
    timestamp?: number;
  }>({});

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    // Load shared items
    const shareData = storage.get<string>('nativeShare:items');
    if (shareData) {
      try {
        const items = JSON.parse(shareData) as SharedItem[];
        setSharedItems(items);
      } catch (e) {
        console.error('Failed to parse shared items:', e);
      }
    }

    // Load processed images
    const actionData = storage.get<string>('nativeAction:items');
    if (actionData) {
      try {
        const items = JSON.parse(actionData) as ProcessedImage[];
        setProcessedImages(items);
      } catch (e) {
        console.error('Failed to parse processed images:', e);
      }
    }

    // Load checkout data
    const itemName = storage.get<string>('lastItemName');
    const price = storage.get<string>('lastPrice');
    const timestamp = storage.get<number>('checkoutTimestamp');
    if (itemName || price || timestamp) {
      setLastCheckout({ itemName, price, timestamp });
    }
  };

  const clearData = (key: string) => {
    storage.remove(key);
    loadData();
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      <ScrollView style={styles.content}>
        <Text style={styles.title}>🔧 Native Extensions Showcase</Text>
        <Text style={styles.subtitle}>
          Extensions built with native Swift code (no React Native)
        </Text>

        {/* Native Share Extension */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📤 Native Share Extension</Text>
          <Text style={styles.description}>
            Share extension built with UIKit. Uses function-based config
            (.ts).
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{sharedItems.length}</Text>
              <Text style={styles.statLabel}>Items Shared</Text>
            </View>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => clearData('nativeShare:items')}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>

          {sharedItems.length > 0 && (
            <View style={styles.itemsList}>
              {sharedItems.slice(0, 3).map((item, index) => (
                <View key={index} style={styles.itemCard}>
                  <Text style={styles.itemType}>{item.type.toUpperCase()}</Text>
                  <Text style={styles.itemContent} numberOfLines={2}>
                    {item.content}
                  </Text>
                  <Text style={styles.itemDate}>
                    {formatDate(item.timestamp)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Native Action Extension */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎨 Native Action Extension</Text>
          <Text style={styles.description}>
            Action extension built with UIKit. Uses function-based config
            (.js).
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{processedImages.length}</Text>
              <Text style={styles.statLabel}>Images Processed</Text>
            </View>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => clearData('nativeAction:items')}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>

          {processedImages.length > 0 && (
            <View style={styles.itemsList}>
              {processedImages.slice(0, 3).map((item, index) => (
                <View key={index} style={styles.itemCard}>
                  <Text style={styles.itemType}>FILTER: {item.filter}</Text>
                  <Text style={styles.itemDate}>
                    {formatDate(item.timestamp)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Native App Clip */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📱 Native App Clip</Text>
          <Text style={styles.description}>
            App Clip built with SwiftUI. Uses function-based config (.ts).
            Test by launching URL: nativeextensionsshowcase://checkout
          </Text>

          {lastCheckout.itemName && (
            <View style={styles.checkoutCard}>
              <Text style={styles.checkoutTitle}>Last Checkout</Text>
              <Text style={styles.checkoutItem}>{lastCheckout.itemName}</Text>
              <Text style={styles.checkoutPrice}>{lastCheckout.price}</Text>
              {lastCheckout.timestamp && (
                <Text style={styles.checkoutDate}>
                  {formatDate(lastCheckout.timestamp)}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoEmoji}>💡</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Function-Based Configs</Text>
            <Text style={styles.infoText}>
              All targets use function-based config files (.ts or .js) that
              receive the Expo config and return target config. This allows
              dynamic configuration based on environment, build type, etc.
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
  itemsList: {
    marginTop: 12,
    gap: 8,
  },
  itemCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
  },
  itemType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  itemContent: {
    fontSize: 14,
    color: '#000',
    marginBottom: 4,
  },
  itemDate: {
    fontSize: 12,
    color: '#999',
  },
  checkoutCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  checkoutTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  checkoutItem: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  checkoutPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  checkoutDate: {
    fontSize: 12,
    color: '#999',
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
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
});

