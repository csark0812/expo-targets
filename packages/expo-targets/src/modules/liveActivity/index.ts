import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import type {
  LiveActivityConfig,
  TargetConfig,
} from '../../../plugin/src/config';
import type {
  LiveActivityAttributesName,
  LiveActivityPayloadFor,
} from '../../generatedNames';
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
export function createLiveActivity<N extends LiveActivityAttributesName>(
  attributesName: N
) {
  resolveAttributesConfig(attributesName);
  type Payload = LiveActivityPayloadFor<N>;
  return {
    attributesName,
    start: (options: {
      attributes: Payload['attributes'];
      contentState: Payload['contentState'];
    }) => LiveActivity.start(attributesName, options),
    update: (activityId: string, contentState: Payload['contentState']) =>
      LiveActivity.update(activityId, contentState),
    end: (activityId: string) => LiveActivity.end(activityId),
  };
}

export const LiveActivity = {
  create: createLiveActivity,

  async start<N extends LiveActivityAttributesName>(
    attributesName: N,
    options: {
      attributes: LiveActivityPayloadFor<N>['attributes'];
      contentState: LiveActivityPayloadFor<N>['contentState'];
    }
  ): Promise<string> {
    resolveAttributesConfig(attributesName);
    return getNative().start(
      attributesName,
      JSON.stringify(options.attributes ?? {}),
      JSON.stringify(options.contentState ?? {})
    );
  },

  async update<N extends LiveActivityAttributesName>(
    activityId: string,
    contentState: LiveActivityPayloadFor<N>['contentState']
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
