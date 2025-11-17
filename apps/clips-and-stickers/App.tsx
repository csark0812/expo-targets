import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { quickCheckoutClip, getLastCheckout, type CheckoutData } from './targets/quick-checkout';

export default function App() {
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);

  useEffect(() => {
    loadCheckout();
    const interval = setInterval(loadCheckout, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadCheckout = () => {
    const data = getLastCheckout();
    if (data) {
      setCheckout(data);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      <ScrollView style={styles.content}>
        <Text style={styles.title}>📱 Clips & Stickers</Text>
        <Text style={styles.subtitle}>
          App Clips and iMessage Stickers showcase
        </Text>

        {/* App Clip Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📱 App Clip</Text>
          <Text style={styles.description}>
            Lightweight app experience launched via URL, NFC, or QR code.
            Perfect for quick interactions without downloading the full app.
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>How to test:</Text>
            <Text style={styles.infoText}>
              1. Build and run the app{'\n'}
              2. Launch App Clip via URL:{'\n'}
              • Safari: clipsandstickers://checkout{'\n'}
              • Or use associated domain:{'\n'}
              • https://clipsandstickers.example.com{'\n'}
              3. Complete checkout in App Clip{'\n'}
              4. See data in main app below
            </Text>
          </View>

          {checkout && (
            <View style={styles.checkoutCard}>
              <Text style={styles.checkoutTitle}>Last Checkout from App Clip</Text>
              <Text style={styles.checkoutItem}>{checkout.itemName}</Text>
              <Text style={styles.checkoutPrice}>{checkout.price}</Text>
              <Text style={styles.checkoutDate}>
                {formatDate(checkout.timestamp)}
              </Text>
            </View>
          )}
        </View>

        {/* iMessage Stickers Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎨 iMessage Stickers</Text>
          <Text style={styles.description}>
            Custom sticker packs for iMessage. Users can send fun stickers
            directly from the Messages app.
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>How to test:</Text>
            <Text style={styles.infoText}>
              1. Build and run the app{'\n'}
              2. Open Messages app{'\n'}
              3. Tap App Store icon in keyboard{'\n'}
              4. Select "Fun Stickers"{'\n'}
              5. Send stickers in conversations
            </Text>
          </View>
        </View>

        {/* Learning Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoEmoji}>💡</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Lightweight Experiences</Text>
            <Text style={styles.infoText}>
              App Clips and iMessage stickers provide lightweight, focused
              experiences that don't require users to download the full app.
              Perfect for quick actions, sharing, and engagement.
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
    marginTop: 8,
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
  checkoutCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  checkoutTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1976D2',
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
    color: '#666',
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

