import { createTarget } from 'expo-targets';
import MessagesApp from './src/MessagesAppExtension';

export const messagesAppTarget = createTarget<'messages'>(
  'MessagesApp',
  MessagesApp
);
