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
  Image,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  demoWidget,
  updateWidget,
  setWidgetAuthStatus,
  setWidgetWeather,
  setWidgetAvatar,
  type WidgetData,
} from './targets/demo-widget';
import { demoShareTarget } from './targets/demo-share';
import { demoActionTarget } from './targets/demo-action';
import type { SharedItem } from './targets/demo-share/src/ShareExtension';
import type { ProcessedItem } from './targets/demo-action/src/ActionExtension';

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
  const [widgetLoggedIn, setWidgetLoggedIn] = useState(false);
  const [widgetUsername, setWidgetUsername] = useState('');
  const [widgetAvatarURL, setWidgetAvatarURL] = useState('');
  const [widgetTemperature, setWidgetTemperature] = useState('72');
  const [sharedItems, setSharedItems] = useState<SharedItem[]>([]);
  const [processedItems, setProcessedItems] = useState<ProcessedItem[]>([]);
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
    const widgetData = demoWidget.getData<WidgetData>();
    if (widgetData?.message) {
      setWidgetMessage(widgetData.message);
    }
    if (widgetData?.isLoggedIn !== undefined) {
      setWidgetLoggedIn(widgetData.isLoggedIn);
    }
    if (widgetData?.username) {
      setWidgetUsername(widgetData.username);
    }
    if (widgetData?.avatarURL) {
      setWidgetAvatarURL(widgetData.avatarURL);
    }
    if (widgetData?.temperature !== undefined) {
      setWidgetTemperature(String(widgetData.temperature));
    }

    const shareData = demoShareTarget.getData<{ items: SharedItem[] }>();
    if (shareData?.items) {
      setSharedItems(shareData.items);
    }

    const actionData = demoActionTarget.getData<{ items: ProcessedItem[] }>();
    if (actionData?.items) {
      setProcessedItems(actionData.items);
    }
  };

  const clearSharedItems = () => {
    demoShareTarget.setData({ items: [] });
    setSharedItems([]);
  };

  const clearProcessedItems = () => {
    demoActionTarget.setData({ items: [] });
    setProcessedItems([]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleWidgetUpdate = () => {
    if (!widgetMessage.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }
    updateWidget(widgetMessage);
    Alert.alert('Success', 'Widget updated! Check your home screen.');
  };

  const handleToggleWidgetLogin = () => {
    const newLoggedIn = !widgetLoggedIn;
    setWidgetLoggedIn(newLoggedIn);
    setWidgetAuthStatus(
      newLoggedIn,
      newLoggedIn ? widgetUsername || 'Demo User' : undefined,
      newLoggedIn ? widgetAvatarURL || undefined : undefined
    );
    if (!widgetUsername && newLoggedIn) {
      setWidgetUsername('Demo User');
    }
  };

  const handleUsernameUpdate = () => {
    if (widgetLoggedIn && widgetUsername.trim()) {
      setWidgetAuthStatus(
        true,
        widgetUsername.trim(),
        widgetAvatarURL || undefined
      );
      Alert.alert('Success', 'Username updated!');
    }
  };

  const handleAvatarUpdate = () => {
    if (widgetAvatarURL.trim()) {
      setWidgetAvatar(widgetAvatarURL.trim());
      Alert.alert('Success', 'Avatar URL updated! Widget will load the image.');
    }
  };

  const handleWeatherUpdate = () => {
    const temp = parseInt(widgetTemperature, 10);
    if (!isNaN(temp)) {
      setWidgetWeather('cloud.sun.fill', temp);
      Alert.alert('Success', 'Weather updated!');
    }
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

          {/* Keychain + SDWebImageSwiftUI Demo Section */}
          <View style={styles.keychainSection}>
            <Text style={styles.keychainTitle}>🔐 Auth & Avatar Demo</Text>
            <Text style={styles.keychainDescription}>
              Widget uses KeychainAccess for auth + SDWebImageSwiftUI for async
              images:
            </Text>

            <View style={styles.loginStatusRow}>
              <Text style={styles.loginStatusLabel}>Login Status:</Text>
              <TouchableOpacity
                style={[
                  styles.loginToggle,
                  widgetLoggedIn
                    ? styles.loginToggleActive
                    : styles.loginToggleInactive,
                ]}
                onPress={handleToggleWidgetLogin}
              >
                <Text style={styles.loginToggleText}>
                  {widgetLoggedIn ? '✓ Signed In' : 'Not Signed In'}
                </Text>
              </TouchableOpacity>
            </View>

            {widgetLoggedIn && (
              <>
                <View style={styles.usernameRow}>
                  <TextInput
                    style={[styles.usernameInput, { flex: 1 }]}
                    placeholder="Username"
                    value={widgetUsername}
                    onChangeText={setWidgetUsername}
                    onBlur={handleUsernameUpdate}
                  />
                </View>
                <View style={styles.usernameRow}>
                  <TextInput
                    style={[styles.usernameInput, { flex: 1 }]}
                    placeholder="Avatar URL (https://...)"
                    value={widgetAvatarURL}
                    onChangeText={setWidgetAvatarURL}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                  <TouchableOpacity
                    style={styles.smallButton}
                    onPress={handleAvatarUpdate}
                  >
                    <Text style={styles.smallButtonText}>Set</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Weather Demo Section */}
          <View style={styles.keychainSection}>
            <Text style={styles.keychainTitle}>🌤️ Weather Demo</Text>
            <Text style={styles.keychainDescription}>
              Demo of additional widget data with SDWebImageSwiftUI:
            </Text>
            <View style={styles.weatherRow}>
              <TextInput
                style={[styles.usernameInput, { flex: 1 }]}
                placeholder="Temperature (°F)"
                value={widgetTemperature}
                onChangeText={setWidgetTemperature}
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={styles.smallButton}
                onPress={handleWeatherUpdate}
              >
                <Text style={styles.smallButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>How to test:</Text>
            <Text style={styles.infoText}>
              1. Update message above{'\n'}
              2. Toggle login status and set username{'\n'}
              3. Set avatar URL (e.g. https://i.pravatar.cc/100){'\n'}
              4. Update weather temperature{'\n'}
              5. Long press home screen → tap + → Search "DemoWidget"{'\n'}
              6. Widget shows avatar via SDWebImageSwiftUI async loading
            </Text>
          </View>
        </View>

        {/* Share Extension Testing */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📤 Share Extension</Text>
          <Text style={styles.description}>
            Share content from other apps (Safari, Photos, etc.) to this app.
            Supports text, URLs, and images.
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>How to test:</Text>
            <Text style={styles.infoText}>
              1. Open Safari or Photos{'\n'}
              2. Tap the Share button{'\n'}
              3. Select "DemoShare"{'\n'}
              4. Tap "Save"
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{sharedItems.length}</Text>
              <Text style={styles.statLabel}>Items Shared</Text>
            </View>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearSharedItems}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Shared Items List */}
        {sharedItems.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Shared Items</Text>
            {sharedItems
              .slice()
              .reverse()
              .map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemDate}>
                      {formatDate(item.sharedAt)}
                    </Text>
                  </View>

                  {item.content.text && (
                    <View style={styles.itemSection}>
                      <Text style={styles.itemLabel}>Text:</Text>
                      <Text style={styles.itemText}>{item.content.text}</Text>
                    </View>
                  )}

                  {item.content.url && (
                    <View style={styles.itemSection}>
                      <Text style={styles.itemLabel}>URL:</Text>
                      <Text style={styles.itemUrl}>{item.content.url}</Text>
                    </View>
                  )}

                  {item.content.images && item.content.images.length > 0 && (
                    <View style={styles.itemSection}>
                      <Text style={styles.itemLabel}>
                        Images ({item.content.images.length}):
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                      >
                        {item.content.images.map((imageUrl, index) => (
                          <Image
                            key={index}
                            source={{ uri: imageUrl }}
                            style={styles.itemImage}
                          />
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              ))}
          </View>
        )}

        {/* Action Extension Testing */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎨 Action Extension</Text>
          <Text style={styles.description}>
            Process images from Photos app with filters. Select an image and
            apply transformations.
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>How to test:</Text>
            <Text style={styles.infoText}>
              1. Open Photos app{'\n'}
              2. Select an image{'\n'}
              3. Tap Share → "DemoAction"{'\n'}
              4. Choose a filter and tap "Process"
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{processedItems.length}</Text>
              <Text style={styles.statLabel}>Images Processed</Text>
            </View>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearProcessedItems}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Processed Items List */}
        {processedItems.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Processed Images</Text>
            {processedItems
              .slice()
              .reverse()
              .map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemDate}>
                      {formatDate(item.processedAt)}
                    </Text>
                    <View style={styles.filterBadge}>
                      <Text style={styles.filterBadgeText}>
                        {item.filter?.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Image
                    source={{ uri: item.originalImage }}
                    style={styles.processedImage}
                  />
                </View>
              ))}
          </View>
        )}

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
  itemCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemDate: {
    fontSize: 12,
    color: '#999',
  },
  filterBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  filterBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  itemSection: {
    marginTop: 8,
  },
  itemLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  itemText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
  itemUrl: {
    fontSize: 14,
    color: '#007AFF',
    lineHeight: 20,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#E5E5EA',
  },
  processedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
    marginTop: 8,
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
  keychainSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  keychainTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  keychainDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  loginStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  loginStatusLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  loginToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  loginToggleActive: {
    backgroundColor: '#34C759',
  },
  loginToggleInactive: {
    backgroundColor: '#8E8E93',
  },
  loginToggleText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  usernameRow: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernameInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  smallButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginLeft: 8,
  },
  smallButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
