import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  createTarget,
  useBrowserTab,
  useBrowserStorage,
  closePopup,
  copyToClipboard,
  openTab,
  type SafariExtensionTarget,
} from 'expo-targets';

interface Props {
  target: SafariExtensionTarget;
}

function SafariExtension({ target }: Props) {
  const tab = useBrowserTab();
  const [clickCount, setClickCount, loading] = useBrowserStorage(
    'clickCount',
    0
  );
  const [copied, setCopied] = React.useState(false);

  const handleCopyUrl = async () => {
    if (tab?.url) {
      const success = await copyToClipboard(tab.url);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleOpenDocs = () => {
    openTab('https://docs.expo.dev');
  };

  const handleIncrement = () => {
    setClickCount(clickCount + 1);
  };

  const handleClose = () => {
    closePopup();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>🦁 Safari Extension</Text>
        <Text style={styles.subtitle}>Built with React Native Web</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Tab</Text>
        {tab ? (
          <View style={styles.tabInfo}>
            <Text style={styles.tabTitle} numberOfLines={1}>
              {tab.title || 'Untitled'}
            </Text>
            <Text style={styles.tabUrl} numberOfLines={2}>
              {tab.url}
            </Text>
          </View>
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Loading tab info...</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Browser Storage</Text>
        <View style={styles.counter}>
          <Text style={styles.counterLabel}>Click count:</Text>
          <Text style={styles.counterValue}>
            {loading ? '...' : clickCount}
          </Text>
        </View>
        <Pressable style={styles.button} onPress={handleIncrement}>
          <Text style={styles.buttonText}>Increment Counter</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.actions}>
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={handleCopyUrl}
            disabled={!tab?.url}
          >
            <Text style={[styles.buttonText, styles.primaryButtonText]}>
              {copied ? '✓ Copied!' : 'Copy URL'}
            </Text>
          </Pressable>

          <Pressable style={styles.button} onPress={handleOpenDocs}>
            <Text style={styles.buttonText}>Open Expo Docs</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.closeButton]}
            onPress={handleClose}
          >
            <Text style={[styles.buttonText, styles.closeButtonText]}>
              Close
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Target: {target.name} • Type: {target.type}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    minWidth: 320,
    maxWidth: 400,
  },
  content: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#8E8E93',
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  tabInfo: {
    gap: 4,
  },
  tabTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  tabUrl: {
    fontSize: 13,
    color: '#007AFF',
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  counterLabel: {
    fontSize: 15,
    color: '#000',
  },
  counterValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
  actions: {
    gap: 8,
  },
  button: {
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  primaryButtonText: {
    color: '#FFF',
  },
  closeButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  closeButtonText: {
    color: '#FF3B30',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  footerText: {
    fontSize: 11,
    color: '#C7C7CC',
  },
});

export default createTarget('DemoSafari', SafariExtension);
