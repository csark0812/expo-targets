import { createTarget } from 'expo-targets';
import ShareExtension from './src/ShareExtension.tsx';

export const demoShareTarget = createTarget<'share'>(
  'DemoShare',
  ShareExtension
);
