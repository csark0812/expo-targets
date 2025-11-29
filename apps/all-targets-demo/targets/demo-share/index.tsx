import { createTarget } from 'expo-targets';
import ShareExtension from './src/ShareExtension';

export const demoShareTarget = createTarget<'share'>(
  'DemoShare',
  ShareExtension
);
