import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

type NativeNotification = {
  processAndPresent: (
    title: string,
    body: string,
    targetName: string | null
  ) => Promise<string>;
  presentContent: (
    title: string,
    body: string,
    targetName: string | null
  ) => Promise<boolean>;
  getLastProcessedTitle: (suite: string) => Promise<string | null>;
  areNotificationsEnabled: () => Promise<boolean>;
};

function getNative(): NativeNotification {
  if (Platform.OS !== 'android') {
    throw new Error(
      '[expo-targets] AndroidNotification helpers are Android-only (local NSE/NCE path).'
    );
  }
  return requireNativeModule<NativeNotification>('ExpoTargetsNotification');
}

/**
 * Android Wave 2 local notification path (not iOS NSE/NCE).
 * FCM remote push remains leftover when credentials are unavailable.
 */
export const AndroidNotification = {
  /** Mutate title + post NotificationCompat (notification-service). */
  processAndPresent(options: {
    title: string;
    body?: string;
    targetName?: string;
  }): Promise<string> {
    return getNative().processAndPresent(
      options.title,
      options.body ?? '',
      options.targetName ?? null
    );
  },

  /** RemoteViews / DecoratedCustomViewStyle (notification-content). */
  presentContent(options: {
    title: string;
    body?: string;
    targetName?: string;
  }): Promise<boolean> {
    return getNative().presentContent(
      options.title,
      options.body ?? '',
      options.targetName ?? null
    );
  },

  getLastProcessedTitle(suite: string): Promise<string | null> {
    return getNative().getLastProcessedTitle(suite);
  },

  areNotificationsEnabled(): Promise<boolean> {
    return getNative().areNotificationsEnabled();
  },
};
