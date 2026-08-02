import { createTarget } from 'expo-targets';
import NotificationContentExtension from './src/NotificationContentExtension';

export const notificationContentTarget = createTarget<'notification-content'>(
  'NotificationContent',
  NotificationContentExtension,
);
