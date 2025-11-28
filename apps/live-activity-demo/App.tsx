import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  createLiveActivity,
  areActivitiesEnabled,
  getActiveLiveActivities,
} from 'expo-targets';

const APP_GROUP = 'group.com.expotargets.liveactivitydemo';

export default function App() {
  const [activityToken, setActivityToken] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);

  // Initialize Live Activity managers
  const deliveryActivity = createLiveActivity('DeliveryTracker', APP_GROUP);
  const workoutActivity = createLiveActivity('WorkoutTracker', APP_GROUP);
  const timerActivity = createLiveActivity('TimerActivity', APP_GROUP);

  React.useEffect(() => {
    checkEnabled();
  }, []);

  const checkEnabled = async () => {
    if (Platform.OS !== 'ios') {
      setIsEnabled(false);
      return;
    }
    const enabled = await areActivitiesEnabled();
    setIsEnabled(enabled);
  };

  // DELIVERY TRACKING DEMO
  const startDelivery = async () => {
    try {
      const token = await deliveryActivity.start(
        {
          orderId: '12345',
          restaurantName: 'Pizza Palace',
        },
        {
          status: 'Order Received',
          eta: '30-40 min',
          driverName: null,
          driverPhoto: null,
        }
      );
      setActivityToken(token);
      setStatus('Delivery activity started');
    } catch (error) {
      Alert.alert('Error', String(error));
    }
  };

  const updateDelivery = async (stage: 'preparing' | 'pickup' | 'delivery') => {
    try {
      switch (stage) {
        case 'preparing':
          await deliveryActivity.update({
            status: 'Preparing Your Order',
            eta: '20-30 min',
            driverName: null,
            driverPhoto: null,
          });
          setStatus('Updated: Preparing');
          break;
        case 'pickup':
          await deliveryActivity.update({
            status: 'Driver Picking Up',
            eta: '15-20 min',
            driverName: 'John Doe',
            driverPhoto: null,
          });
          setStatus('Updated: Driver assigned');
          break;
        case 'delivery':
          await deliveryActivity.update({
            status: 'Out for Delivery',
            eta: '5-10 min',
            driverName: 'John Doe',
            driverPhoto: null,
          });
          setStatus('Updated: Out for delivery');
          break;
      }
    } catch (error) {
      Alert.alert('Error', String(error));
    }
  };

  const completeDelivery = async () => {
    try {
      await deliveryActivity.end('default');
      setActivityToken(null);
      setStatus('Delivery completed');
    } catch (error) {
      Alert.alert('Error', String(error));
    }
  };

  // WORKOUT TRACKING DEMO
  const startWorkout = async () => {
    try {
      const token = await workoutActivity.start(
        {
          workoutType: 'Running',
          targetDistance: '5.0 km',
        },
        {
          currentDistance: '0.0 km',
          currentPace: '0:00 /km',
          elapsedTime: '00:00',
          calories: 0,
        }
      );
      setActivityToken(token);
      setStatus('Workout started');
      
      // Simulate workout updates
      simulateWorkout();
    } catch (error) {
      Alert.alert('Error', String(error));
    }
  };

  const simulateWorkout = () => {
    let distance = 0;
    let time = 0;
    const interval = setInterval(async () => {
      distance += 0.1;
      time += 30;
      const calories = Math.floor(distance * 60);
      
      if (distance >= 5.0) {
        clearInterval(interval);
        await workoutActivity.end('default');
        setStatus('Workout completed!');
        return;
      }
      
      await workoutActivity.update({
        currentDistance: `${distance.toFixed(1)} km`,
        currentPace: '5:30 /km',
        elapsedTime: `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`,
        calories,
      });
      setStatus(`Workout: ${distance.toFixed(1)} km`);
    }, 3000);
  };

  // TIMER DEMO
  const startTimer = async (duration: number) => {
    try {
      const token = await timerActivity.start(
        {
          timerName: 'Pizza Timer',
          totalSeconds: duration,
        },
        {
          remainingSeconds: duration,
          progress: 0,
          isRunning: true,
        }
      );
      setActivityToken(token);
      setStatus('Timer started');
      
      // Simulate timer countdown
      simulateTimer(duration);
    } catch (error) {
      Alert.alert('Error', String(error));
    }
  };

  const simulateTimer = (totalSeconds: number) => {
    let remaining = totalSeconds;
    const interval = setInterval(async () => {
      remaining -= 1;
      const progress = ((totalSeconds - remaining) / totalSeconds) * 100;
      
      if (remaining <= 0) {
        clearInterval(interval);
        await timerActivity.update({
          remainingSeconds: 0,
          progress: 100,
          isRunning: false,
        });
        await timerActivity.end('immediate');
        setStatus('Timer finished!');
        Alert.alert('Timer Done!', 'Your timer has finished.');
        return;
      }
      
      await timerActivity.update({
        remainingSeconds: remaining,
        progress: Math.floor(progress),
        isRunning: true,
      });
    }, 1000);
  };

  // CHECK ACTIVE ACTIVITIES
  const checkActive = async () => {
    try {
      const activities = await getActiveLiveActivities(APP_GROUP);
      Alert.alert(
        'Active Activities',
        `Found ${activities.length} active activities:\n${activities.map(a => a.id).join('\n')}`
      );
    } catch (error) {
      Alert.alert('Error', String(error));
    }
  };

  if (Platform.OS !== 'ios') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Live Activities</Text>
        <Text style={styles.error}>
          Live Activities are only available on iOS 16.1+
        </Text>
      </View>
    );
  }

  if (isEnabled === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Live Activities</Text>
        <Text style={styles.error}>
          Live Activities are disabled. Please enable them in Settings &gt; YourApp &gt; Live Activities
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>🏝️ Dynamic Island Demo</Text>
        <Text style={styles.subtitle}>Test Live Activities on iOS 16.1+</Text>

        {status ? (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        ) : null}

        {/* Delivery Tracking */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🍕 Delivery Tracking</Text>
          <TouchableOpacity style={styles.button} onPress={startDelivery}>
            <Text style={styles.buttonText}>Start Delivery</Text>
          </TouchableOpacity>
          {activityToken && (
            <>
              <TouchableOpacity
                style={styles.buttonSecondary}
                onPress={() => updateDelivery('preparing')}
              >
                <Text style={styles.buttonText}>→ Preparing</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.buttonSecondary}
                onPress={() => updateDelivery('pickup')}
              >
                <Text style={styles.buttonText}>→ Pickup</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.buttonSecondary}
                onPress={() => updateDelivery('delivery')}
              >
                <Text style={styles.buttonText}>→ Out for Delivery</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonDanger]}
                onPress={completeDelivery}
              >
                <Text style={styles.buttonText}>✓ Complete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Workout Tracking */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏃 Workout Tracking</Text>
          <TouchableOpacity style={styles.button} onPress={startWorkout}>
            <Text style={styles.buttonText}>Start 5K Run</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>Auto-completes after simulated run</Text>
        </View>

        {/* Timer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏱️ Countdown Timer</Text>
          <TouchableOpacity style={styles.button} onPress={() => startTimer(10)}>
            <Text style={styles.buttonText}>10 Second Timer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => startTimer(60)}>
            <Text style={styles.buttonText}>1 Minute Timer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => startTimer(300)}>
            <Text style={styles.buttonText}>5 Minute Timer</Text>
          </TouchableOpacity>
        </View>

        {/* Utils */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.buttonOutline} onPress={checkActive}>
            <Text style={styles.buttonOutlineText}>Check Active Activities</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            💡 Long-press the Dynamic Island to see expanded view
          </Text>
          <Text style={styles.footerText}>
            📱 Works on Lock Screen for all iOS 16.1+ devices
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
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
    marginBottom: 24,
    textAlign: 'center',
  },
  statusBox: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonSecondary: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonDanger: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonOutline: {
    borderWidth: 2,
    borderColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonOutlineText: {
    color: '#007AFF',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  footer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FFE5B4',
    borderRadius: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#8B4513',
    marginBottom: 4,
  },
  error: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    padding: 20,
  },
});
