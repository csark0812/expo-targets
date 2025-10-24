import { defineTarget } from 'expo-targets';

export const contentShare = defineTarget({
  type: 'share',
  name: 'ContentShare',
  displayName: 'Share to App',
  platforms: ['ios'],
  appGroup: 'group.com.test.shareextension',
  ios: {
    deploymentTarget: '17.0',
    bundleIdentifier: 'com.test.shareextension.share',
    displayName: 'Share Extension',
    colors: {
      AccentColor: { light: '#007AFF', dark: '#0A84FF' },
      BackgroundColor: { light: '#FFFFFF', dark: '#1C1C1E' },
    },
    entitlements: {
      'com.apple.security.application-groups': [
        'group.com.test.shareextension',
      ],
    },
  },
});

interface SharedItemsData {
  items: Array<{
    type: string;
    content: string;
    timestamp: number;
  }>;
}

// Store shared item
export const storeSharedItem = async (type: string, content: string) => {
  const timestamp = Date.now();

  const item = {
    type,
    content,
    timestamp,
  };

  // Get existing items
  const existingData = await contentShare.getData<SharedItemsData>();
  const items = existingData?.items || [];

  // Add new item at the beginning
  items.unshift(item);

  // Keep only last 50 items
  const trimmedItems = items.slice(0, 50);

  // Store back
  await contentShare.setData<SharedItemsData>({ items: trimmedItems });
};

// Get all shared items
export const getSharedItems = async () => {
  const data = await contentShare.getData<SharedItemsData>();
  return data?.items || [];
};

// Clear all shared items
export const clearSharedItems = async () => {
  await contentShare.setData<SharedItemsData>({ items: [] });
};
