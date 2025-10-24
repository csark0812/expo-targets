import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Button, ScrollView } from 'react-native';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';

export default function App() {
  const [invocationURL, setInvocationURL] = useState<string>('');
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [clipData, setClipData] = useState<string>('No data shared yet');

  useEffect(() => {
    // Get initial URL
    Linking.getInitialURL().then((url: string | null) => {
      if (url) {
        setInvocationURL(url);
        parseURLParams(url);
      }
    });

    // Listen for URL changes
    const subscription = Linking.addEventListener(
      'url',
      ({ url }: { url: string }) => {
        setInvocationURL(url);
        parseURLParams(url);
      }
    );

    // Get location
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
      }
    })();

    return () => subscription.remove();
  }, []);

  const parseURLParams = (url: string) => {
    const parsed = Linking.parse(url);
    if (parsed.queryParams?.data) {
      setClipData(String(parsed.queryParams.data));
    }
  };

  const openFullApp = () => {
    // This would open the full app if installed
    Linking.openURL('clipadvanced://main');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      <ScrollView style={styles.content}>
        <Text style={styles.title}>🎯 App Clip Demo</Text>
        <Text style={styles.subtitle}>Advanced Features Showcase</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Invocation URL</Text>
          <Text style={styles.cardContent}>
            {invocationURL || 'Launched directly'}
          </Text>
        </View>

        {clipData !== 'No data shared yet' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Shared Data</Text>
            <Text style={styles.cardContent}>{clipData}</Text>
          </View>
        )}

        {location && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Current Location</Text>
            <Text style={styles.cardContent}>
              Lat: {location.coords.latitude.toFixed(4)}
              {'\n'}
              Lon: {location.coords.longitude.toFixed(4)}
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>App Clip Features</Text>
          <Text style={styles.cardContent}>
            • Lightweight (under 15MB){'\n'}• Quick launch from NFC/QR/Safari
            {'\n'}• Location-based experiences{'\n'}• Seamless upgrade to full
            app
          </Text>
        </View>

        <Button title="Open Full App" onPress={openFullApp} color="#007AFF" />
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
  cardContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
