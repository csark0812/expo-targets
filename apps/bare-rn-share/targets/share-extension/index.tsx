import { createTarget } from 'expo-targets';
import ShareExtension from './src/ShareExtension.tsx';

export const shareExtensionTarget = createTarget<'share'>(
  'ShareExtension',
  ShareExtension
);
