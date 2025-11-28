import { requireNativeModule, Platform } from 'expo-modules-core';

// Only load the module on iOS 16.1+
let ExpoTargetsLiveActivityModule: any = null;

try {
  if (Platform.OS === 'ios') {
    ExpoTargetsLiveActivityModule = requireNativeModule('ExpoTargetsLiveActivity');
  }
} catch (error) {
  console.warn('[expo-targets] Live Activities are only available on iOS 16.1+');
}

export type ActivityDismissalPolicy = 'default' | 'immediate' | 'after';

export interface LiveActivityAttributes {
  [key: string]: any;
}

export interface LiveActivityContentState {
  [key: string]: any;
}

export interface LiveActivityState {
  id: string;
  token: string;
  isEnded: boolean;
  attributes: LiveActivityAttributes;
  contentState: LiveActivityContentState;
  lastUpdate: number;
}

export interface LiveActivity {
  id: string;
  token: string;
  attributes: LiveActivityAttributes;
  contentState: LiveActivityContentState;
}

/**
 * Live Activity Manager for Dynamic Island and Lock Screen
 * 
 * Manages iOS Live Activities which power Dynamic Island on iPhone 14 Pro+
 * and persistent notifications on the Lock Screen for all iOS 16.1+ devices.
 * 
 * @example
 * ```typescript
 * const activity = new LiveActivityManager('delivery-tracker', 'group.com.myapp');
 * 
 * // Start activity
 * const token = await activity.start(
 *   { orderId: '12345' }, 
 *   { status: 'preparing', eta: '10 min' }
 * );
 * 
 * // Update activity
 * await activity.update({ status: 'on-the-way', eta: '5 min' });
 * 
 * // End activity
 * await activity.end('immediate');
 * ```
 */
export class LiveActivityManager {
  constructor(
    private readonly activityId: string,
    private readonly appGroup: string
  ) {
    if (!ExpoTargetsLiveActivityModule) {
      console.warn(
        '[expo-targets] LiveActivityManager requires iOS 16.1+ and the ExpoTargetsLiveActivity native module'
      );
    }
  }

  /**
   * Start a new Live Activity
   * @param attributes Static attributes that don't change during the activity's lifetime
   * @param contentState Dynamic content that can be updated
   * @returns Activity token for tracking
   */
  async start(
    attributes: LiveActivityAttributes,
    contentState: LiveActivityContentState
  ): Promise<string | null> {
    if (!ExpoTargetsLiveActivityModule) {
      console.warn('[expo-targets] Live Activities not available');
      return null;
    }

    try {
      const token = await ExpoTargetsLiveActivityModule.startActivity(
        this.activityId,
        attributes,
        contentState,
        this.appGroup
      );
      return token;
    } catch (error) {
      console.error('[expo-targets] Failed to start Live Activity:', error);
      return null;
    }
  }

  /**
   * Update an active Live Activity with new content
   * @param contentState New dynamic content
   * @returns Success status
   */
  async update(contentState: LiveActivityContentState): Promise<boolean> {
    if (!ExpoTargetsLiveActivityModule) {
      console.warn('[expo-targets] Live Activities not available');
      return false;
    }

    try {
      return await ExpoTargetsLiveActivityModule.updateActivity(
        this.activityId,
        contentState,
        this.appGroup
      );
    } catch (error) {
      console.error('[expo-targets] Failed to update Live Activity:', error);
      return false;
    }
  }

  /**
   * End a Live Activity
   * @param dismissalPolicy How quickly to dismiss the activity
   *   - 'default': Stays on screen for a while before dismissing
   *   - 'immediate': Dismisses immediately
   *   - 'after': Dismisses after a specified time (requires iOS 16.2+)
   * @returns Success status
   */
  async end(dismissalPolicy: ActivityDismissalPolicy = 'default'): Promise<boolean> {
    if (!ExpoTargetsLiveActivityModule) {
      console.warn('[expo-targets] Live Activities not available');
      return false;
    }

    try {
      return await ExpoTargetsLiveActivityModule.endActivity(
        this.activityId,
        dismissalPolicy,
        this.appGroup
      );
    } catch (error) {
      console.error('[expo-targets] Failed to end Live Activity:', error);
      return false;
    }
  }

  /**
   * Get the current state of the Live Activity
   * @returns Activity state or null if not found
   */
  async getState(): Promise<LiveActivityState | null> {
    if (!ExpoTargetsLiveActivityModule) {
      console.warn('[expo-targets] Live Activities not available');
      return null;
    }

    try {
      return await ExpoTargetsLiveActivityModule.getActivityState(
        this.activityId,
        this.appGroup
      );
    } catch (error) {
      console.error('[expo-targets] Failed to get Live Activity state:', error);
      return null;
    }
  }

  /**
   * Clear all data for this Live Activity
   * @returns Success status
   */
  async clear(): Promise<boolean> {
    if (!ExpoTargetsLiveActivityModule) {
      console.warn('[expo-targets] Live Activities not available');
      return false;
    }

    try {
      return await ExpoTargetsLiveActivityModule.clearActivity(
        this.activityId,
        this.appGroup
      );
    } catch (error) {
      console.error('[expo-targets] Failed to clear Live Activity:', error);
      return false;
    }
  }
}

/**
 * Get all active Live Activities
 * @param appGroup App Group identifier
 * @returns Array of active activities
 */
export async function getActiveLiveActivities(
  appGroup: string
): Promise<LiveActivity[]> {
  if (!ExpoTargetsLiveActivityModule) {
    console.warn('[expo-targets] Live Activities not available');
    return [];
  }

  try {
    return await ExpoTargetsLiveActivityModule.getActiveActivities(null, appGroup);
  } catch (error) {
    console.error('[expo-targets] Failed to get active Live Activities:', error);
    return [];
  }
}

/**
 * Check if Live Activities are enabled on this device
 * @returns True if Live Activities are supported and enabled
 */
export async function areActivitiesEnabled(): Promise<boolean> {
  if (!ExpoTargetsLiveActivityModule) {
    return false;
  }

  try {
    return await ExpoTargetsLiveActivityModule.areActivitiesEnabled();
  } catch (error) {
    console.error('[expo-targets] Failed to check if activities are enabled:', error);
    return false;
  }
}

/**
 * Create a Live Activity manager for a specific activity
 * @param activityId Unique identifier for the activity
 * @param appGroup App Group identifier
 * @returns LiveActivityManager instance
 */
export function createLiveActivity(
  activityId: string,
  appGroup: string
): LiveActivityManager {
  return new LiveActivityManager(activityId, appGroup);
}
