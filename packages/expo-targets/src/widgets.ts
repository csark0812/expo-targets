/**
 * Thin re-exports from private `expo-widgets` for expo-ui widget interactions
 * and push-to-start tokens. Prefer expo-targets verbs elsewhere
 * (`createTarget`, `setData`, `LiveActivity.*`).
 *
 * Android Glance / RemoteViews Bump taps emit via ExpoTargetsStorage
 * `onUserInteraction` (same event shape as expo-widgets on iOS).
 */
import type { EventSubscription } from 'expo-modules-core';
import { Platform, requireNativeModule } from 'expo-modules-core';

type ExpoWidgetsModule = {
  addUserInteractionListener: (
    listener: (event: UserInteractionEvent) => void
  ) => EventSubscription;
  addPushToStartTokenListener: (
    listener: (event: PushToStartTokenEvent) => void
  ) => EventSubscription;
};

type ExpoTargetsStorageNative = {
  addListener: (
    eventName: 'onUserInteraction',
    listener: (event: UserInteractionEvent) => void
  ) => EventSubscription;
};

export type UserInteractionEvent = {
  source: string;
  target: string;
  timestamp: number;
  type: 'ExpoWidgetsUserInteraction';
};

export type PushToStartTokenEvent = {
  activityPushToStartToken: string;
};

function loadExpoWidgets(): ExpoWidgetsModule {
  try {
    return require('expo-widgets') as ExpoWidgetsModule;
  } catch (error) {
    throw new Error(
      `[expo-targets] expo-widgets is required for widget interaction / push-to-start listeners. ` +
        `Underlying error: ${error}`
    );
  }
}

/** Listen for widget Button / toggle presses (iOS AppIntent or Android Glance/RemoteViews). */
export function addUserInteractionListener(
  listener: (event: UserInteractionEvent) => void
): EventSubscription {
  if (Platform.OS === 'android') {
    const storage = requireNativeModule(
      'ExpoTargetsStorage'
    ) as ExpoTargetsStorageNative;
    return storage.addListener('onUserInteraction', listener);
  }
  return loadExpoWidgets().addUserInteractionListener(listener);
}

/**
 * Listen for ActivityKit push-to-start tokens (APNs remote start).
 * Devicewright cannot green remote push on Simulator — see CLAIMS live-activity.
 */
export function addPushToStartTokenListener(
  listener: (event: PushToStartTokenEvent) => void
): EventSubscription {
  if (Platform.OS === 'android') {
    return { remove: () => {} };
  }
  return loadExpoWidgets().addPushToStartTokenListener(listener);
}
