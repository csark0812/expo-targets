import { defineTarget } from 'expo-targets';

export const checkoutClip = defineTarget({
  type: 'clip',
  name: 'CheckoutClip',
  displayName: 'Quick Checkout',
  platforms: ['ios'],
  appGroup: 'group.com.test.clipadvanced',
  ios: {
    deploymentTarget: '17.0',
    bundleIdentifier: 'com.test.clipadvanced.clip',
    displayName: 'Quick Checkout',
    colors: {
      AccentColor: { light: '#007AFF', dark: '#0A84FF' },
      BackgroundColor: { light: '#FFFFFF', dark: '#000000' },
      PrimaryText: { light: '#000000', dark: '#FFFFFF' },
    },
    entitlements: {
      'com.apple.developer.associated-domains': [
        'appclips:clipadvanced.example.com',
      ],
      'com.apple.developer.on-demand-install-capable': true,
    },
  },
});

// Store data that can be accessed from the clip
export const storeCheckoutData = async (itemId: string, price: number) => {
  await checkoutClip.set('lastItemId', itemId);
  await checkoutClip.set('lastPrice', price.toString());
  await checkoutClip.set('timestamp', Date.now().toString());
};

// Retrieve checkout history from the clip
export const getCheckoutHistory = async () => {
  const itemId = await checkoutClip.get('lastItemId');
  const price = await checkoutClip.get('lastPrice');
  const timestamp = await checkoutClip.get('timestamp');

  return {
    itemId,
    price: price ? parseFloat(price) : null,
    timestamp: timestamp ? parseInt(timestamp) : null,
  };
};
