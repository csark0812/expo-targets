import { createTarget } from 'expo-targets';

// Name from expo-target.config.ts
export const checkoutClip = createTarget('CheckoutClip');

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
