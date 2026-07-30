import { createTarget } from 'expo-targets';
import MessagesExtension from './src/MessagesExtension';

export const messagesTarget = createTarget<'messages'>(
  'Messages',
  MessagesExtension
);
