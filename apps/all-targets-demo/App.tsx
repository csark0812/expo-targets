import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { demoWidget, updateWidget } from './targets/demo-widget';
import { demoShareTarget } from './targets/demo-share';
import { demoActionTarget } from './targets/demo-action';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [widgetMessage, setWidgetMessage] = useState('');
  const [sharedData, setSharedData] = useState<any>(null);
  const [actionData, setActionData] = useState<any>(null);
  const [notificationStatus, setNotificationStatus] = useState<string>('');

  useEffect(() => {
    loadData();
    setupNotifications();
  }, []);

  const setupNotifications = async () => {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    setNotificationStatus(finalStatus);

    if (finalStatus !== 'granted') {
      console.log('Notification permissions not granted');
    }

    // Register notification categories for content extension
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync('DEMO_CONTENT', [
        {
          identifier: 'view',
          buttonTitle: 'View Details',
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'dismiss',
          buttonTitle: 'Dismiss',
          options: { isDestructive: true },
        },
      ]);
    }
  };

  // Test notification that triggers the Notification Service Extension
  const triggerServiceNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Service Extension Test',
        body: 'This notification will be processed by NotificationService',
        data: {
          type: 'service-test',
          timestamp: Date.now(),
        },
        // mutable-content is automatically set by expo-notifications for rich notifications
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
      },
    });
    Alert.alert(
      'Notification Scheduled',
      'Check your notifications in 2 seconds. The service extension will add ✨ to the title.'
    );
  };

  // Test notification that triggers the Notification Content Extension
  const triggerContentNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Content Extension Test',
        body: 'Long press this notification to see custom UI!',
        categoryIdentifier: 'DEMO_CONTENT',
        data: {
          type: 'content-test',
          icon: 'star.fill',
          tintColor: '#FF6B6B',
          timestamp: Date.now(),
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
      },
    });
    Alert.alert(
      'Notification Scheduled',
      'Long press the notification when it appears to see the custom content UI!'
    );
  };

  // Test notification with image (for service extension image download)
  const triggerImageNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Rich Media Test',
        body: 'This notification includes an image attachment',
        data: {
          type: 'image-test',
          imageURL: 'https://picsum.photos/400/300',
          timestamp: Date.now(),
        },
        categoryIdentifier: 'DEMO_CONTENT',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
      },
    });
    Alert.alert(
      'Notification Scheduled',
      'The service extension will download and attach an image.'
    );
  };

  const loadData = () => {
    const widgetData = demoWidget.getData<{ message?: string }>();
    if (widgetData?.message) {
      setWidgetMessage(widgetData.message);
    }

    const shareData = demoShareTarget.getData();
    if (shareData) {
      setSharedData(shareData);
    }

    const actionData = demoActionTarget.getData();
    if (actionData) {
      setActionData(actionData);
    }
  };

  const handleWidgetUpdate = () => {
    if (!widgetMessage.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }
    updateWidget(widgetMessage);
    Alert.alert('Success', 'Widget updated! Check your home screen.');
  };

  const handleRefreshData = () => {
    loadData();
    Alert.alert('Refreshed', 'Data reloaded from App Groups');
  };

  const productionTargets = [
    { type: 'widget', name: 'DemoWidget', status: '✅ Production Ready' },
    { type: 'clip', name: 'DemoClip', status: '✅ Production Ready' },
    { type: 'share', name: 'DemoShare', status: '✅ Production Ready (RN)' },
    { type: 'action', name: 'DemoAction', status: '✅ Production Ready (RN)' },
    { type: 'stickers', name: 'DemoStickers', status: '✅ Production Ready' },
    { type: 'messages', name: 'DemoMessages', status: '✅ Production Ready' },
    {
      type: 'intent',
      name: 'DemoIntent',
      status: '✅ Production Ready',
      description: 'Handles workout intents via Siri',
    },
  ];

  const configOnlyTargets = [
    { type: 'safari', name: 'DemoSafari', status: '📋 Config Only' },
    { type: 'intent-ui', name: 'DemoIntentUI', status: '📋 Config Only' },
  ];

  const notificationTargets = [
    {
      type: 'notification-content',
      name: 'DemoNotificationContent',
      status: '✅ Testable',
      description: 'Long press notifications for custom UI',
    },
    {
      type: 'notification-service',
      name: 'DemoNotificationService',
      status: '✅ Testable',
      description: 'Modifies notifications before display',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      <ScrollView style={styles.content}>
        <Text style={styles.title}>🎯 All Targets Demo</Text>
        <Text style={styles.subtitle}>
          Comprehensive showcase of all expo-targets capabilities
        </Text>

        {/* Widget Testing */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📱 Widget Testing</Text>
          <Text style={styles.description}>
            Update widget data and see it appear on your home screen:
          </Text>

          <View style={styles.section}>
            <Text style={styles.label}>Current Widget Message:</Text>
            <Text style={styles.currentValue}>
              {widgetMessage || 'No message set'}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>New Message:</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter message for widget"
              value={widgetMessage}
              onChangeText={setWidgetMessage}
            />
          </View>

          <TouchableOpacity
            style={styles.testButton}
            onPress={handleWidgetUpdate}
          >
            <Text style={styles.testButtonText}>Update Widget</Text>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>How to test:</Text>
            <Text style={styles.infoText}>
              1. Update message above{'\n'}
              2. Long press home screen → tap +{'\n'}
              3. Search for "DemoWidget"{'\n'}
              4. Add widget to see your message
            </Text>
          </View>
        </View>

        {/* Share Extension Testing */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📤 Share Extension Testing</Text>
          <Text style={styles.description}>
            Read data saved by the share extension:
          </Text>

          {sharedData ? (
            <View style={styles.dataBox}>
              <Text style={styles.dataLabel}>Shared Data:</Text>
              <Text style={styles.dataText}>
                {JSON.stringify(sharedData, null, 2)}
              </Text>
            </View>
          ) : (
            <Text style={styles.noDataText}>
              No data yet. Share something from Safari or Photos to test.
            </Text>
          )}

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>How to test:</Text>
            <Text style={styles.infoText}>
              1. Open Safari or Photos{'\n'}
              2. Tap Share button{'\n'}
              3. Select "DemoShare"{'\n'}
              4. Tap "Save"{'\n'}
              5. Return here and tap "Refresh Data"
            </Text>
          </View>
        </View>

        {/* Action Extension Testing */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎨 Action Extension Testing</Text>
          <Text style={styles.description}>
            Read data saved by the action extension:
          </Text>

          {actionData ? (
            <View style={styles.dataBox}>
              <Text style={styles.dataLabel}>Action Data:</Text>
              <Text style={styles.dataText}>
                {JSON.stringify(actionData, null, 2)}
              </Text>
            </View>
          ) : (
            <Text style={styles.noDataText}>
              No data yet. Process an image from Photos to test.
            </Text>
          )}

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>How to test:</Text>
            <Text style={styles.infoText}>
              1. Open Photos app{'\n'}
              2. Select an image{'\n'}
              3. Tap Share → "DemoAction"{'\n'}
              4. Tap "Process"{'\n'}
              5. Return here and tap "Refresh Data"
            </Text>
          </View>
        </View>

        {/* Refresh Button */}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefreshData}
        >
          <Text style={styles.refreshButtonText}>🔄 Refresh Data</Text>
        </TouchableOpacity>

        {/* Notification Extension Testing */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            🔔 Notification Extensions Testing
          </Text>
          <Text style={styles.description}>
            Test the notification service and content extensions:
          </Text>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Permission Status:</Text>
            <Text
              style={[
                styles.statusValue,
                {
                  color:
                    notificationStatus === 'granted' ? '#34C759' : '#FF3B30',
                },
              ]}
            >
              {notificationStatus || 'Unknown'}
            </Text>
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.notifButton, styles.serviceButton]}
              onPress={triggerServiceNotification}
            >
              <Text style={styles.notifButtonText}>📬 Service Extension</Text>
              <Text style={styles.notifButtonSubtext}>
                Modifies notification title
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.notifButton, styles.contentButton]}
              onPress={triggerContentNotification}
            >
              <Text style={styles.notifButtonText}>📋 Content Extension</Text>
              <Text style={styles.notifButtonSubtext}>
                Long press to see UI
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.notifButton, styles.imageButton]}
              onPress={triggerImageNotification}
            >
              <Text style={styles.notifButtonText}>🖼️ Rich Media</Text>
              <Text style={styles.notifButtonSubtext}>
                Downloads & attaches image
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>How to test:</Text>
            <Text style={styles.infoText}>
              1. Tap a button above to schedule notification{'\n'}
              2. Wait 2 seconds for notification{'\n'}
              3. Service: Look for ✨ prefix in title{'\n'}
              4. Content: Long press notification for custom UI{'\n'}
              5. Check Xcode console for extension logs
            </Text>
          </View>
        </View>

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
              {target.description && (
                <Text style={styles.targetDescription}>
                  {target.description}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Notification Targets */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔔 Notification Targets</Text>
          <Text style={styles.description}>
            Fully implemented notification extensions - use the buttons above to
            test:
          </Text>

          {notificationTargets.map((target) => (
            <View key={target.name} style={styles.targetItem}>
              <View style={styles.targetHeader}>
                <Text style={styles.targetName}>{target.name}</Text>
                <Text style={styles.targetStatus}>{target.status}</Text>
              </View>
              <Text style={styles.targetType}>Type: {target.type}</Text>
              {target.description && (
                <Text style={styles.targetDescription}>
                  {target.description}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Config Only Targets */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Config-Only Targets</Text>
          <Text style={styles.description}>
            Targets with proper configuration and placeholder Swift code. These
            demonstrate the config structure but require full implementation for
            production use:
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
              code, and React Native entry points (where supported). All targets
              share the same App Group for data synchronization.
            </Text>
          </View>
        </View>

        {/* External Testing Instructions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🧪 External Testing Guide</Text>

          <View style={styles.testingSection}>
            <Text style={styles.testingTitle}>📱 Widget</Text>
            <Text style={styles.testingText}>
              Use the widget test section above to update data, then add widget
              to home screen.
            </Text>
          </View>

          <View style={styles.testingSection}>
            <Text style={styles.testingTitle}>📤 Share Extension</Text>
            <Text style={styles.testingText}>
              Safari/Photos → Share → DemoShare → Save. Then refresh data here.
            </Text>
          </View>

          <View style={styles.testingSection}>
            <Text style={styles.testingTitle}>🎨 Action Extension</Text>
            <Text style={styles.testingText}>
              Photos → Select image → Share → DemoAction → Process. Then refresh
              data here.
            </Text>
          </View>

          <View style={styles.testingSection}>
            <Text style={styles.testingTitle}>💬 Messages App</Text>
            <Text style={styles.testingText}>
              Messages → Tap App Store icon → Select "DemoMessages" → Send
              message
            </Text>
          </View>

          <View style={styles.testingSection}>
            <Text style={styles.testingTitle}>🎭 Stickers</Text>
            <Text style={styles.testingText}>
              Messages → Tap App Store icon → Select "DemoStickers" → Send
              sticker
            </Text>
          </View>

          <View style={styles.testingSection}>
            <Text style={styles.testingTitle}>🔗 App Clip</Text>
            <Text style={styles.testingText}>
              Requires URL/NFC trigger. In Xcode: Edit Scheme → Run → Arguments
              → Environment Variables → Add _XCAppClipURL =
              https://alltargetsdemo.example.com/clip
            </Text>
          </View>

          <View style={styles.testingSection}>
            <Text style={styles.testingTitle}>🎙️ Siri Intents</Text>
            <Text style={styles.testingText}>
              Say: "Hey Siri, start a workout" or "Hey Siri, pause my workout".
              The DemoIntent extension handles workout intents.
            </Text>
          </View>

          <View style={styles.testingSection}>
            <Text style={styles.testingTitle}>🌐 Safari Extension</Text>
            <Text style={styles.testingText}>
              Safari → Settings → Extensions → Enable "DemoSafari"
            </Text>
          </View>

          <View style={styles.testingSection}>
            <Text style={styles.testingTitle}>🔔 Notifications</Text>
            <Text style={styles.testingText}>
              Trigger a local notification from your app. The notification
              extensions will process it automatically.
            </Text>
          </View>
        </View>

        {/* Siri Intent Testing */}
        <View style={styles.infoCard}>
          <Text style={styles.infoEmoji}>🎙️</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Testing Siri Intents</Text>
            <Text style={styles.infoText}>
              The DemoIntent extension handles workout intents. Try saying:
              {'\n'}
              {'\n'}• "Hey Siri, start a workout"{'\n'}• "Hey Siri, pause my
              workout"{'\n'}• "Hey Siri, resume my workout"{'\n'}• "Hey Siri,
              end my workout"{'\n'}
              {'\n'}The intent extension will handle the request and can open
              the main app with workout context.
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
  targetDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
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
  section: {
    marginVertical: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  currentValue: {
    fontSize: 14,
    color: '#007AFF',
    fontStyle: 'italic',
    marginTop: 4,
  },
  testButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  dataBox: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  dataLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  dataText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#000',
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginVertical: 12,
    textAlign: 'center',
  },
  testingSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  testingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  testingText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonGroup: {
    gap: 10,
  },
  notifButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  serviceButton: {
    backgroundColor: '#5856D6',
  },
  contentButton: {
    backgroundColor: '#FF9500',
  },
  imageButton: {
    backgroundColor: '#AF52DE',
  },
  notifButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  notifButtonSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 4,
  },
});
