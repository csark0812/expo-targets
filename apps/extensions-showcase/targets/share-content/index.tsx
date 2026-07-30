import { createTarget } from 'expo-targets';
import ShareExtension from './src/ShareExtension.tsx';

export const shareContentTarget = createTarget<'share'>(
  'ShareContent',
  ShareExtension
);
