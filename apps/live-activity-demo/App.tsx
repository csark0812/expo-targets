import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  NativeModules,
  Platform,
  Alert,
} from 'react-native';

const { ExpoLiveActivity } = NativeModules;

export default function App() {
  const [activityId, setActivityId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('Ready to start');

  const startLiveActivity = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('iOS Only', 'Live Activities are only available on iOS 16.1+');
      return;
    }

    try {
      // Note: This requires a native module implementation
      // For now, this is a demonstration of the API design
      Alert.alert(
        'Live Activity',
        'To start a Live Activity, you need to implement the native module. Check the documentation for details.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Simulate starting an activity
              setActivityId('demo-activity-id');
              setStatus('Activity Started');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to start Live Activity:', error);
      Alert.alert('Error', 'Failed to start Live Activity');
    }
  };

  const updateLiveActivity = async () => {
    if (!activityId) {
      Alert.alert('No Activity', 'Start a Live Activity first');
      return;
    }

    const newScore = score + 1;
    setScore(newScore);
    setStatus(`Score: ${newScore}`);

    // Update the Live Activity
    // This would call the native module to update ActivityKit
    console.log('Updating Live Activity with score:', newScore);
  };

  const endLiveActivity = async () => {
    if (!activityId) {
      Alert.alert('No Activity', 'No active Live Activity to end');
      return;
    }

    try {
      setActivityId(null);
      setScore(0);
      setStatus('Activity Ended');
      Alert.alert('Success', 'Live Activity ended');
    } catch (error) {
      console.error('Failed to end Live Activity:', error);
      Alert.alert('Error', 'Failed to end Live Activity');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Live Activity Demo</Text>
        <Text style={styles.subtitle}>
          iOS 16.1+ • Dynamic Island & Lock Screen
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📱 What are Live Activities?</Text>
          <Text style={styles.infoText}>
            Live Activities let you display real-time information on the Lock Screen and
            in the Dynamic Island. Perfect for sports scores, delivery tracking, ride
            sharing, and more.
          </Text>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Status</Text>
          <Text style={styles.statusValue}>{status}</Text>
          {activityId && (
            <>
              <Text style={styles.scoreLabel}>Current Score</Text>
              <Text style={styles.scoreValue}>{score}</Text>
            </>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={startLiveActivity}
            disabled={!!activityId}
          >
            <Text style={styles.buttonText}>
              {activityId ? 'Activity Running' : 'Start Live Activity'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, !activityId && styles.disabled]}
            onPress={updateLiveActivity}
            disabled={!activityId}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Increment Score
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.dangerButton, !activityId && styles.disabled]}
            onPress={endLiveActivity}
            disabled={!activityId}
          >
            <Text style={styles.buttonText}>End Live Activity</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.guideBox}>
          <Text style={styles.guideTitle}>🚀 Quick Start</Text>
          <Text style={styles.guideStep}>1. Run this app on iOS 16.1+ device</Text>
          <Text style={styles.guideStep}>2. Tap "Start Live Activity"</Text>
          <Text style={styles.guideStep}>3. Lock your device to see it on Lock Screen</Text>
          <Text style={styles.guideStep}>4. Check the Dynamic Island (iPhone 14 Pro+)</Text>
          <Text style={styles.guideStep}>5. Tap "Increment Score" to update in real-time</Text>
        </View>

        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            💡 <Text style={styles.noteBold}>Note:</Text> To fully implement Live
            Activities, you need to create a native module that interfaces with
            ActivityKit. The target is already configured and will show up in the Dynamic
            Island and Lock Screen once started.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1976d2',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#424242',
  },
  statusCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2196f3',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 20,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2196f3',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2196f3',
  },
  dangerButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButtonText: {
    color: '#2196f3',
  },
  disabled: {
    opacity: 0.5,
  },
  guideBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  guideStep: {
    fontSize: 14,
    lineHeight: 24,
    color: '#424242',
    paddingLeft: 8,
  },
  noteBox: {
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#424242',
  },
  noteBold: {
    fontWeight: '600',
    color: '#e65100',
  },
});
