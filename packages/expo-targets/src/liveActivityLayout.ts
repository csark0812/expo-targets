import type { ReactNode } from 'react';

/**
 * Expo-ui Live Activity multi-slot layout (Dynamic Island + banner).
 * Registered via private expo-widgets `createLiveActivity` — same entry as
 * the home `createTarget(name, Layout)`. Control still uses
 * `LiveActivity.create(attributesName)` which routes to the blob factory.
 */
export type LiveActivityLayout = {
  banner: ReactNode;
  bannerSmall?: ReactNode;
  compactLeading?: ReactNode;
  compactTrailing?: ReactNode;
  minimal?: ReactNode;
  expandedCenter?: ReactNode;
  expandedLeading?: ReactNode;
  expandedTrailing?: ReactNode;
  expandedBottom?: ReactNode;
};

export type LiveActivityEnvironment = {
  isLuminanceReduced?: boolean;
  isActivityFullscreen?: boolean;
  activityFamily?: 'small' | 'medium';
};

export type LiveActivityLayoutComponent<T extends object = object> = (
  props: T,
  environment: LiveActivityEnvironment
) => LiveActivityLayout;

export type ExpoUiLiveActivityInstance = {
  id: string;
  update: (props: Record<string, unknown>) => Promise<void>;
  end: () => Promise<void>;
  getPushToken: () => Promise<string | null>;
};

type ExpoUiLiveActivityHandle = {
  start: (
    props: Record<string, unknown>,
    url?: string
  ) => ExpoUiLiveActivityInstance;
  getInstances: () => ExpoUiLiveActivityInstance[];
};

type RawExpoUiInstance<T> = {
  id?: string;
  update: (props: T) => Promise<void>;
  end: (...args: unknown[]) => Promise<void>;
  getPushToken: () => Promise<string | null>;
};

const expoUiLiveActivities = new Map<string, ExpoUiLiveActivityHandle>();
/** attributesName → target name (for LiveActivity.create routing). */
const attributesToTarget = new Map<string, string>();
/** activity id → instance (expo-ui update/end). */
const expoUiInstances = new Map<string, ExpoUiLiveActivityInstance>();

export function getExpoUiLiveActivityFactory(
  targetName: string
): ExpoUiLiveActivityHandle | undefined {
  return expoUiLiveActivities.get(targetName);
}

export function getExpoUiLiveActivityByAttributes(
  attributesName: string
): ExpoUiLiveActivityHandle | undefined {
  const targetName = attributesToTarget.get(attributesName);
  return targetName ? expoUiLiveActivities.get(targetName) : undefined;
}

export function getExpoUiLiveActivityInstance(
  activityId: string
): ExpoUiLiveActivityInstance | undefined {
  return expoUiInstances.get(activityId);
}

export function registerExpoUiLiveActivityAttributes(
  attributesName: string,
  targetName: string
): void {
  attributesToTarget.set(attributesName, targetName);
}

function wrapExpoUiInstance<T>(
  name: string,
  raw: RawExpoUiInstance<T>
): ExpoUiLiveActivityInstance {
  const id = String(raw.id ?? `expo-ui-la-${name}-${Date.now()}`);
  const instance: ExpoUiLiveActivityInstance = {
    id,
    update: (props) => raw.update(props as T),
    end: async () => {
      await raw.end('immediate');
      expoUiInstances.delete(id);
    },
    getPushToken: () => raw.getPushToken(),
  };
  expoUiInstances.set(id, instance);
  return instance;
}

/**
 * Register expo-ui Live Activity slots for a widget target.
 * `name` must match the widget `createTarget` / config `name`.
 * Layout must use the `'widget'` directive like home Layouts.
 */
export function createLiveActivityLayout<T extends object = object>(
  name: string,
  liveActivity: LiveActivityLayoutComponent<T>
): ExpoUiLiveActivityHandle {
  try {
    const { createLiveActivity } = require('expo-widgets') as {
      createLiveActivity: (
        name: string,
        layout: LiveActivityLayoutComponent<T>
      ) => {
        start: (props: T, url?: string) => RawExpoUiInstance<T>;
        getInstances: () => RawExpoUiInstance<T>[];
      };
    };
    const factory = createLiveActivity(name, liveActivity);
    const handle: ExpoUiLiveActivityHandle = {
      start: (props, url) =>
        wrapExpoUiInstance(name, factory.start(props as T, url)),
      getInstances: () =>
        factory.getInstances().map((raw) => wrapExpoUiInstance(name, raw)),
    };
    expoUiLiveActivities.set(name, handle);
    return handle;
  } catch (error) {
    throw new Error(
      `[expo-targets] createLiveActivityLayout("${name}") requires expo-widgets ` +
        `(private dependency) and a Layout with the 'widget' directive. ` +
        `Underlying error: ${error}`
    );
  }
}
