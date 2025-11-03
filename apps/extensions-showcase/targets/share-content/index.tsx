import { createTarget } from 'expo-targets';
import ShareExtension from './src/ShareExtension';

export const shareContentTarget = createTarget<'share'>(
  'ShareContent',
  ShareExtension
);
