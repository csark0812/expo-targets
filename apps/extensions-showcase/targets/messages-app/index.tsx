import { createTarget } from 'expo-targets';
import MessagesApp from './src/MessagesAppExtension.tsx';

export const messagesAppTarget = createTarget<'messages'>(
  'MessagesApp',
  MessagesApp
);
