import { createTarget } from 'expo-targets';
import SafariExtension from './src/SafariExtension';

export const safariTarget = createTarget<'safari'>('Safari', SafariExtension);
