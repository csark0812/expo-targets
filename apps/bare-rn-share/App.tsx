import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { shareExtensionTarget } from './targets/share-extension';

interface SharedItem {
  sharedAt: string;
  content: {
    text?: string;
    url?: string;
    images?: string[];
  };
}

export default function App() {
  const [sharedItems, setSharedItems] = useState<SharedItem[]>([]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    const data = shareExtensionTarget.getData<{ items: SharedItem[] }>();
    if (data?.items) {
      setSharedItems(data.items);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      <ScrollView style={styles.content}>
        <Text style={styles.title}>🔧 Bare RN Share</Text>
        <Text style={styles.subtitle}>
          Share extension with React Native in bare workflow
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Workflow: Bare React Native</Text>
          <Text style={styles.description}>
            This app demonstrates a share extension with React Native UI in a
            bare React Native workflow. Uses `expo-targets sync` instead of
            `expo prebuild`.
          </Text>

          <View style={styles.stepsBox}>
            <Text style={styles.stepsTitle}>Setup Steps:</Text>
            <Text style={styles.step}>1. Create Xcode project manually</Text>
            <Text style={styles.step}>2. Run: npx expo-targets sync</Text>
            <Text style={styles.step}>3. Configure Metro (see metro.config.js)</Text>
            <Text style={styles.step}>4. cd ios && pod install</Text>
            <Text style={styles.step}>5. Build in Xcode (Release mode for RN extensions)</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Shared Items ({sharedItems.length})</Text>
          <Text style={styles.description}>
            Content shared from other apps via the share extension:
          </Text>

          {sharedItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No items shared yet. Try sharing from Safari or Photos.
              </Text>
            </View>
          ) : (
            sharedItems
              .slice()
              .reverse()
              .map((item, index) => (
                <View key={index} style={styles.itemCard}>
                  <Text style={styles.itemDate}>
                    {formatDate(item.sharedAt)}
                  </Text>
                  {item.content.text && (
                    <Text style={styles.itemText}>{item.content.text}</Text>
                  )}
                  {item.content.url && (
                    <Text style={styles.itemUrl}>{item.content.url}</Text>
                  )}
                  {item.content.images && (
                    <Text style={styles.itemText}>
                      {item.content.images.length} image(s)
                    </Text>
                  )}
                </View>
              ))
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoEmoji}>💡</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Metro Configuration</Text>
            <Text style={styles.infoText}>
              Extensions with React Native require Metro configuration. See
              `metro.config.js` for the `withTargetsMetro` wrapper. This is
              required for bundling React Native code in extensions.
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoEmoji}>⚠️</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Release Mode</Text>
            <Text style={styles.infoText}>
              React Native extensions only work in Release builds. Make sure to
              build with Release configuration in Xcode, not Debug.
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
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
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
  stepsBox: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  stepsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  step: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  itemCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  itemDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  itemText: {
    fontSize: 14,
    color: '#000',
    marginBottom: 4,
  },
  itemUrl: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
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

