import { createTarget } from 'expo-targets';
import ActionExtension from './src/ActionExtension.tsx';

export const demoActionTarget = createTarget<'action'>(
  'DemoAction',
  ActionExtension
);
