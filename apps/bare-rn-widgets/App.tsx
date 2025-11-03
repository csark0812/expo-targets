import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { simpleWidget, updateMessage, getMessage } from './targets/simple-widget';

export default function App() {
  const [message, setMessage] = useState('');

  const handleUpdate = () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }
    updateMessage(message);
    Alert.alert('Success', 'Widget updated!');
    setMessage('');
  };

  const handleRead = () => {
    const msg = getMessage();
    Alert.alert('Widget Message', msg || 'No message set');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      <View style={styles.content}>
        <Text style={styles.title}>🔧 Bare RN Widgets</Text>
        <Text style={styles.subtitle}>
          Widget example using bare React Native workflow
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Workflow: Bare React Native</Text>
          <Text style={styles.description}>
            This app uses the bare React Native workflow with expo-targets.
            Instead of using `expo prebuild`, you use `expo-targets sync` to
            sync targets into your existing Xcode project.
          </Text>

          <View style={styles.stepsBox}>
            <Text style={styles.stepsTitle}>Setup Steps:</Text>
            <Text style={styles.step}>1. Create Xcode project manually</Text>
            <Text style={styles.step}>2. Run: npx expo-targets sync</Text>
            <Text style={styles.step}>3. cd ios && pod install</Text>
            <Text style={styles.step}>4. Build in Xcode</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Update Widget</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter message for widget"
            value={message}
            onChangeText={setMessage}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.button} onPress={handleUpdate}>
              <Text style={styles.buttonText}>Update Widget</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.readButton]}
              onPress={handleRead}
            >
              <Text style={styles.buttonText}>Read Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoEmoji}>💡</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Bare RN Workflow</Text>
            <Text style={styles.infoText}>
              Perfect for existing bare React Native projects. The sync command
              adds targets to your existing Xcode project without regenerating
              everything. You maintain full control over your native code.
            </Text>
          </View>
        </View>
      </View>
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
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  readButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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

