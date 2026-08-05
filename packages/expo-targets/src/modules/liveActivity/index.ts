import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import type {
  LiveActivityConfig,
  TargetConfig,
} from '../../../plugin/src/config';
import { listTargets } from '../targetsConfig';

type NativeLiveActivity = {
  start: (
    attributesName: string,
    attributesJson: string,
    contentStateJson: string
  ) => Promise<string>;
  update: (activityId: string, contentStateJson: string) => Promise<boolean>;
  end: (activityId: string) => Promise<void>;
  endAll: () => Promise<void>;
  areActivitiesEnabled: () => Promise<boolean>;
};

export type LiveActivityContentState = Record<
  string,
  string | number | boolean
>;

export type LiveActivityStartOptions = {
  attributes: LiveActivityContentState;
  contentState: LiveActivityContentState;
};

function getNative(): NativeLiveActivity {
  if (Platform.OS !== 'ios') {
    throw new Error('[expo-targets] LiveActivity is only available on iOS.');
  }
  return requireNativeModule<NativeLiveActivity>('ExpoTargetsLiveActivity');
}

function liveActivityConfigs(): {
  target: TargetConfig;
  config: LiveActivityConfig;
}[] {
  return listTargets()
    .filter((t) => t.type === 'widget' && t.liveActivity?.attributesName)
    .map((t) => ({ target: t, config: t.liveActivity as LiveActivityConfig }));
}

function resolveAttributesConfig(attributesName: string): LiveActivityConfig {
  const matches = liveActivityConfigs().filter(
    (x) => x.config.attributesName === attributesName
  );
  if (matches.length === 0) {
    const names = liveActivityConfigs()
      .map((x) => x.config.attributesName)
      .join(', ');
    throw new Error(
      `[expo-targets] Unknown Live Activity attributesName "${attributesName}". ` +
        `Configured: ${names || '(none)'}. ` +
        `Add liveActivity.attributesName to the widget expo-target.config.json.`
    );
  }
  return matches[0].config;
}

/** Typed helpers keyed by configured attributesName (widgets-like paved path). */
export function createLiveActivity(attributesName: string) {
  resolveAttributesConfig(attributesName);
  return {
    attributesName,
    start: (options: LiveActivityStartOptions) =>
      LiveActivity.start(attributesName, options),
    update: (activityId: string, contentState: LiveActivityContentState) =>
      LiveActivity.update(activityId, contentState),
    end: (activityId: string) => LiveActivity.end(activityId),
  };
}

export const LiveActivity = {
  create: createLiveActivity,

  async start(
    attributesName: string,
    options: LiveActivityStartOptions
  ): Promise<string> {
    resolveAttributesConfig(attributesName);
    return getNative().start(
      attributesName,
      JSON.stringify(options.attributes ?? {}),
      JSON.stringify(options.contentState ?? {})
    );
  },

  async update(
    activityId: string,
    contentState: LiveActivityContentState
  ): Promise<boolean> {
    return getNative().update(activityId, JSON.stringify(contentState ?? {}));
  },

  async end(activityId: string): Promise<void> {
    return getNative().end(activityId);
  },

  async endAll(): Promise<void> {
    return getNative().endAll();
  },

  async areActivitiesEnabled(): Promise<boolean> {
    return getNative().areActivitiesEnabled();
  },
};
