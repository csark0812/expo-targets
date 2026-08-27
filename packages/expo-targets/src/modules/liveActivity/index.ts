import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import type {
  LiveActivityConfig,
  TargetConfig,
} from '../../../plugin/src/config';
import { resolveLiveActivityConfigs } from '../../../plugin/src/ios/utils/resolveIosKinds';
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
  endAllForAttributes?: (attributesName: string) => Promise<void>;
  areActivitiesEnabled: () => Promise<boolean>;
};

export type LiveActivityContentState = Record<
  string,
  string | number | boolean
>;

export type LiveActivityStartOptions = {
  attributes: LiveActivityContentState;
  contentState: LiveActivityContentState;
  /**
   * When true (default), end activities for this attributesName before start.
   * Does not call global `endAll`.
   */
  replaceExisting?: boolean;
};

export type LiveActivityHandle<
  N extends LiveActivityAttributesName = LiveActivityAttributesName,
> = {
  attributesName: N;
  start: (options: {
    attributes: LiveActivityPayloadFor<N>['attributes'];
    contentState: LiveActivityPayloadFor<N>['contentState'];
    replaceExisting?: boolean;
  }) => Promise<string>;
  update: (
    activityId: string,
    contentState: LiveActivityPayloadFor<N>['contentState']
  ) => Promise<boolean>;
  end: (activityId: string) => Promise<void>;
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
    for (const config of resolveLiveActivityConfigs(target)) {
      if (config.attributesName) {
        rows.push({ target, config });
      }
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
        `Use createTarget('Folder').liveActivity('${attributesName}') from the widget target entry.`
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

async function endActivitiesForAttributes(
  attributesName: string
): Promise<void> {
  const native = getNative();
  if (typeof native.endAllForAttributes === 'function') {
    await native.endAllForAttributes(attributesName);
    return;
  }
  await native.endAll();
}

/** Start a Live Activity by configured attributesName (used by target handles). */
export async function startLiveActivity<N extends LiveActivityAttributesName>(
  attributesName: N,
  options: {
    attributes: LiveActivityPayloadFor<N>['attributes'];
    contentState: LiveActivityPayloadFor<N>['contentState'];
    replaceExisting?: boolean;
  }
): Promise<string> {
  if (options.replaceExisting !== false) {
    await endActivitiesForAttributes(attributesName);
  }
  const { target } = resolveMatch(attributesName);
  if (target.entry) {
    ensureExpoUiAttributesLink(attributesName);
    const factory = getExpoUiLiveActivityByAttributes(attributesName);
    if (!factory) {
      throw new Error(
        `[expo-targets] liveActivity("${attributesName}") for expo-ui widget ` +
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
}

export async function updateLiveActivity<N extends LiveActivityAttributesName>(
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
}

export async function endLiveActivity(activityId: string): Promise<void> {
  const expoUi = getExpoUiLiveActivityInstance(activityId);
  if (expoUi) {
    await expoUi.end();
    return;
  }
  return getNative().end(activityId);
}

export async function endAllLiveActivities(): Promise<void> {
  return getNative().endAll();
}

export async function areLiveActivitiesEnabled(): Promise<boolean> {
  return getNative().areActivitiesEnabled();
}

/** Target-scoped Live Activity handle (preferred host API). */
export function buildLiveActivityHandle<N extends LiveActivityAttributesName>(
  attributesName: N
): LiveActivityHandle<N> {
  resolveAttributesConfig(attributesName);
  ensureExpoUiAttributesLink(attributesName);
  return {
    attributesName,
    start: (options) => startLiveActivity(attributesName, options),
    update: (activityId, contentState) =>
      updateLiveActivity(activityId, contentState),
    end: (activityId) => endLiveActivity(activityId),
  };
}

/**
 * @deprecated Use `createTarget('Folder').liveActivity('AttributesName')` from the widget target entry.
 */
export function createLiveActivity<N extends LiveActivityAttributesName>(
  attributesName: N
): LiveActivityHandle<N> {
  return buildLiveActivityHandle(attributesName);
}

/** OS / session helpers. Prefer target handles for start/update/end. */
export const LiveActivity = {
  /** @deprecated Use `createTarget('Folder').liveActivity('AttributesName')`. */
  create: createLiveActivity,

  /** @deprecated Use the handle from `.liveActivity(...)`. */
  start: startLiveActivity,

  update: updateLiveActivity,
  end: endLiveActivity,
  endAll: endAllLiveActivities,
  areActivitiesEnabled: areLiveActivitiesEnabled,
};
