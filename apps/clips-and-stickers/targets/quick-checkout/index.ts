import { createTarget } from 'expo-targets';
import { AppGroupStorage } from 'expo-targets';

const storage = new AppGroupStorage('group.com.test.clipsandstickers');

export const quickCheckoutClip = createTarget('QuickCheckout');

export interface CheckoutData {
  itemName: string;
  price: string;
  timestamp: number;
}

export const getLastCheckout = (): CheckoutData | null => {
  const itemName = storage.get<string>('lastItemName');
  const price = storage.get<string>('lastPrice');
  const timestamp = storage.get<number>('checkoutTimestamp');

  if (itemName && price && timestamp) {
    return { itemName, price, timestamp };
  }
  return null;
};
