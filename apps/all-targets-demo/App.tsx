import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';

export default function App() {
  const productionTargets = [
    { type: 'widget', name: 'DemoWidget', status: '✅ Production Ready' },
    { type: 'clip', name: 'DemoClip', status: '✅ Production Ready' },
    { type: 'share', name: 'DemoShare', status: '✅ Production Ready (RN)' },
    { type: 'action', name: 'DemoAction', status: '✅ Production Ready (RN)' },
    { type: 'stickers', name: 'DemoStickers', status: '✅ Production Ready' },
  ];

  const configOnlyTargets = [
    { type: 'safari', name: 'DemoSafari', status: '📋 Config Only' },
    { type: 'notification-content', name: 'DemoNotificationContent', status: '📋 Config Only' },
    { type: 'notification-service', name: 'DemoNotificationService', status: '📋 Config Only' },
    { type: 'intent', name: 'DemoIntent', status: '📋 Config Only' },
    { type: 'intent-ui', name: 'DemoIntentUI', status: '📋 Config Only' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      <ScrollView style={styles.content}>
        <Text style={styles.title}>🎯 All Targets Demo</Text>
        <Text style={styles.subtitle}>
          Comprehensive showcase of all expo-targets capabilities
        </Text>

        {/* Production Ready Targets */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✅ Production Ready Targets</Text>
          <Text style={styles.description}>
            Fully implemented targets with working examples:
          </Text>

          {productionTargets.map((target) => (
            <View key={target.name} style={styles.targetItem}>
              <View style={styles.targetHeader}>
                <Text style={styles.targetName}>{target.name}</Text>
                <Text style={styles.targetStatus}>{target.status}</Text>
              </View>
              <Text style={styles.targetType}>Type: {target.type}</Text>
            </View>
          ))}
        </View>

        {/* Config Only Targets */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Config-Only Targets</Text>
          <Text style={styles.description}>
            Targets with proper configuration and placeholder Swift code.
            These demonstrate the config structure but require full
            implementation for production use:
          </Text>

          {configOnlyTargets.map((target) => (
            <View key={target.name} style={styles.targetItem}>
              <View style={styles.targetHeader}>
                <Text style={styles.targetName}>{target.name}</Text>
                <Text style={styles.targetStatus}>{target.status}</Text>
              </View>
              <Text style={styles.targetType}>Type: {target.type}</Text>
            </View>
          ))}
        </View>

        {/* Architecture Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoEmoji}>🏗️</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Multi-Target Architecture</Text>
            <Text style={styles.infoText}>
              This app demonstrates how to configure multiple targets in a
              single app. Each target can have its own configuration, Swift
              code, and React Native entry points (where supported). All
              targets share the same App Group for data synchronization.
            </Text>
          </View>
        </View>

        {/* Usage Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoEmoji}>💡</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Using This Demo</Text>
            <Text style={styles.infoText}>
              Run `npx expo prebuild -p ios --clean` to generate all targets.
              Check the Xcode project to see all configured targets. Production
              targets have full implementations, config-only targets show the
              structure for future implementation.
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
  targetItem: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  targetName: {
    fontSize: 16,
    fontWeight: '600',
  },
  targetStatus: {
    fontSize: 12,
    fontWeight: '500',
    color: '#007AFF',
  },
  targetType: {
    fontSize: 13,
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

