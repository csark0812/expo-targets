import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import type {
  LiveActivityConfig,
  TargetConfig,
} from '../../../plugin/src/config';
import { resolveLiveActivityConfig } from '../../../plugin/src/ios/utils/resolveIosKinds';
import type {
  LiveActivityAttributesName,
  LiveActivityPayloadFor,
} from '../../generatedNames';
import {
  getExpoUiLiveActivityByAttributes,
  getExpoUiLiveActivityInstance,
  registerExpoUiLiveActivityAttributes,
} from '../../liveActivityLayout';
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
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    throw new Error(
      '[expo-targets] LiveActivity is only available on iOS and Android.'
    );
  }
  return requireNativeModule<NativeLiveActivity>('ExpoTargetsLiveActivity');
}

function liveActivityConfigs(): {
  target: TargetConfig;
  config: LiveActivityConfig;
}[] {
  const rows: { target: TargetConfig; config: LiveActivityConfig }[] = [];
  for (const target of listTargets()) {
    if (target.type !== 'widget') {
      continue;
    }
    const config = resolveLiveActivityConfig(target);
    if (config?.attributesName) {
      rows.push({ target, config });
    }
  }
  return rows;
}

function resolveMatch(attributesName: string): {
  target: TargetConfig;
  config: LiveActivityConfig;
} {
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
        `Add a { "type": "live-activity", "attributesName": "..." } row to ios.kinds.`
    );
  }
  return matches[0];
}

function resolveAttributesConfig(attributesName: string): LiveActivityConfig {
  return resolveMatch(attributesName).config;
}

function ensureExpoUiAttributesLink(attributesName: string): void {
  const { target } = resolveMatch(attributesName);
  if (target.entry) {
    registerExpoUiLiveActivityAttributes(attributesName, target.name);
  }
}

function mergeExpoUiProps(options: {
  attributes: Record<string, unknown>;
  contentState: Record<string, unknown>;
}): Record<string, unknown> {
  return { ...options.attributes, ...options.contentState };
}

/** Typed helpers keyed by configured attributesName (widgets-like paved path). */
export function createLiveActivity<N extends LiveActivityAttributesName>(
  attributesName: N
) {
  resolveAttributesConfig(attributesName);
  ensureExpoUiAttributesLink(attributesName);
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
    const { target } = resolveMatch(attributesName);
    if (target.entry) {
      ensureExpoUiAttributesLink(attributesName);
      const factory = getExpoUiLiveActivityByAttributes(attributesName);
      if (!factory) {
        throw new Error(
          `[expo-targets] LiveActivity.start("${attributesName}") for expo-ui widget ` +
            `"${target.name}" requires createLiveActivityLayout('${target.name}', Layout) ` +
            `in the widget entry (same file as createTarget).`
        );
      }
      const instance = factory.start(
        mergeExpoUiProps({
          attributes: (options.attributes ?? {}) as Record<string, unknown>,
          contentState: (options.contentState ?? {}) as Record<string, unknown>,
        })
      );
      return instance.id;
    }
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
    const expoUi = getExpoUiLiveActivityInstance(activityId);
    if (expoUi) {
      await expoUi.update(
        (contentState ?? {}) as unknown as Record<string, unknown>
      );
      return true;
    }
    return getNative().update(activityId, JSON.stringify(contentState ?? {}));
  },

  async end(activityId: string): Promise<void> {
    const expoUi = getExpoUiLiveActivityInstance(activityId);
    if (expoUi) {
      await expoUi.end();
      return;
    }
    return getNative().end(activityId);
  },

  async endAll(): Promise<void> {
    return getNative().endAll();
  },

  async areActivitiesEnabled(): Promise<boolean> {
    return getNative().areActivitiesEnabled();
  },
};
