import { createTarget } from 'expo-targets';
import ActionExtension from './src/ActionExtension';

export const demoActionTarget = createTarget<'action'>(
  'DemoAction',
  ActionExtension
);
