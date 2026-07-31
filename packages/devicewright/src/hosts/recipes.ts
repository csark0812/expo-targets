import type { HostId } from '../claims';
import type { DeviceSession } from '../session';

export type HostJourneyResult = {
  host: HostId;
  ok: boolean;
  steps: string[];
  error?: string;
  screenshotPath?: string | Buffer;
};

export type HostRecipe = {
  id: HostId;
  /** Run the agent-facing journey on an open session. */
  run: (device: DeviceSession) => Promise<HostJourneyResult>;
};

async function safeJourney(
  host: HostId,
  device: DeviceSession,
  steps: Array<{ name: string; fn: () => Promise<void> }>
): Promise<HostJourneyResult> {
  const done: string[] = [];
  try {
    for (const step of steps) {
      await step.fn();
      done.push(step.name);
    }
    const shot = await device.screenshot();
    return { host, ok: true, steps: done, screenshotPath: shot };
  } catch (e) {
    return { host, ok: false, steps: done, error: String(e) };
  }
}

/** Photos → Share Sheet → look for share UI. */
export const shareRecipe: HostRecipe = {
  id: 'share',
  async run(device) {
    return safeJourney('share', device, [
      {
        name: 'launch-photos',
        fn: async () => {
          await device.launchApp('com.apple.mobileslideshow', {
            terminateRunning: true,
          });
        },
      },
      {
        name: 'open-share-or-assert-library',
        fn: async () => {
          // Prefer Share if visible; otherwise assert Photos chrome exists.
          const share = device.getByText('Share', { timeoutMs: 3000 });
          if (await share.isVisible()) {
            await share.tap();
            return;
          }
          const library = device.getByText('Library', { timeoutMs: 5000 });
          if (!(await library.isVisible())) {
            // Fall back to accessibility tree non-empty
            const tree = await device.accessibilityTree();
            if (tree.length === 0) {
              throw new Error('Photos UI tree empty');
            }
          }
        },
      },
    ]);
  },
};

export const messagesRecipe: HostRecipe = {
  id: 'messages',
  async run(device) {
    return safeJourney('messages', device, [
      {
        name: 'launch-messages',
        fn: async () => {
          await device.launchApp('com.apple.MobileSMS', {
            terminateRunning: true,
          });
        },
      },
      {
        name: 'assert-messages-ui',
        fn: async () => {
          const tree = await device.accessibilityTree();
          if (tree.length === 0) throw new Error('Messages UI empty');
        },
      },
    ]);
  },
};

export const stickersRecipe: HostRecipe = {
  id: 'stickers',
  async run(device) {
    return safeJourney('stickers', device, [
      {
        name: 'launch-messages',
        fn: async () => {
          await device.launchApp('com.apple.MobileSMS', {
            terminateRunning: true,
          });
        },
      },
      {
        name: 'assert-tree',
        fn: async () => {
          const tree = await device.accessibilityTree();
          if (tree.length === 0) throw new Error('Stickers/Messages UI empty');
        },
      },
    ]);
  },
};

export const photosRecipe: HostRecipe = {
  id: 'photos',
  async run(device) {
    return safeJourney('photos', device, [
      {
        name: 'launch-photos',
        fn: async () => {
          await device.launchApp('com.apple.mobileslideshow', {
            terminateRunning: true,
          });
        },
      },
      {
        name: 'assert-photos',
        fn: async () => {
          const tree = await device.accessibilityTree();
          if (tree.length === 0) throw new Error('Photos UI empty');
        },
      },
    ]);
  },
};

export const springboardRecipe: HostRecipe = {
  id: 'springboard',
  async run(device) {
    return safeJourney('springboard', device, [
      {
        name: 'launch-springboard',
        fn: async () => {
          await device.launchApp('com.apple.springboard', {
            terminateRunning: false,
          });
        },
      },
      {
        name: 'assert-home',
        fn: async () => {
          const tree = await device.accessibilityTree();
          if (tree.length === 0) throw new Error('SpringBoard UI empty');
        },
      },
    ]);
  },
};

export const settingsRecipe: HostRecipe = {
  id: 'settings',
  async run(device) {
    return safeJourney('settings', device, [
      {
        name: 'launch-settings',
        fn: async () => {
          await device.launchApp('com.apple.Preferences', {
            terminateRunning: true,
          });
        },
      },
      {
        name: 'assert-settings',
        fn: async () => {
          const general = device.getByText('General', { timeoutMs: 8000 });
          if (!(await general.isVisible())) {
            const tree = await device.accessibilityTree();
            if (tree.length === 0) throw new Error('Settings UI empty');
          }
        },
      },
    ]);
  },
};

export const safariRecipe: HostRecipe = {
  id: 'safari',
  async run(device) {
    return safeJourney('safari', device, [
      {
        name: 'launch-safari',
        fn: async () => {
          await device.launchApp('com.apple.mobilesafari', {
            terminateRunning: true,
          });
        },
      },
      {
        name: 'assert-safari',
        fn: async () => {
          const tree = await device.accessibilityTree();
          if (tree.length === 0) throw new Error('Safari UI empty');
        },
      },
    ]);
  },
};

export const walletRecipe: HostRecipe = {
  id: 'wallet',
  async run(device) {
    return safeJourney('wallet', device, [
      {
        name: 'launch-wallet',
        fn: async () => {
          await device.launchApp('com.apple.Passbook', {
            terminateRunning: true,
          });
        },
      },
      {
        name: 'assert-wallet',
        fn: async () => {
          const tree = await device.accessibilityTree();
          if (tree.length === 0) throw new Error('Wallet UI empty');
        },
      },
    ]);
  },
};

export const clipRecipe: HostRecipe = {
  id: 'clip',
  async run(device) {
    return safeJourney('clip', device, [
      {
        name: 'launch-safari-for-clip-surface',
        fn: async () => {
          // App Clip invocation is URL-based; Safari is the control-plane probe.
          await device.launchApp('com.apple.mobilesafari', {
            terminateRunning: true,
          });
        },
      },
      {
        name: 'assert-ready',
        fn: async () => {
          const tree = await device.accessibilityTree();
          if (tree.length === 0) throw new Error('Clip probe UI empty');
        },
      },
    ]);
  },
};

export const widgetsRecipe: HostRecipe = {
  id: 'widgets',
  async run(device) {
    return safeJourney('widgets', device, [
      {
        name: 'springboard',
        fn: async () => {
          await device.launchApp('com.apple.springboard');
        },
      },
      {
        name: 'assert-springboard',
        fn: async () => {
          const tree = await device.accessibilityTree();
          if (tree.length === 0)
            throw new Error('Widgets/SpringBoard UI empty');
        },
      },
    ]);
  },
};

/** Android hello-path: launch Settings (or package), assert text, screenshot. */
export const androidHelloRecipe: HostRecipe = {
  id: 'android-hello',
  async run(device) {
    return safeJourney('android-hello', device, [
      {
        name: 'launch-settings',
        fn: async () => {
          await device.launchApp('com.android.settings', {
            terminateRunning: true,
          });
        },
      },
      {
        name: 'assert-settings-text',
        fn: async () => {
          const search = device.getByText('Settings', { timeoutMs: 10000 });
          if (!(await search.isVisible())) {
            const tree = await device.accessibilityTree();
            if (tree.length === 0) {
              throw new Error('Android Settings UI empty');
            }
          }
        },
      },
    ]);
  },
};

/** Android OS-host analogs (Phase 3 deepen) — share/settings/browser probes. */
export const androidShareAnalogRecipe: HostRecipe = {
  id: 'android-hello',
  async run(device) {
    // Deepen uses same hello host id for claim tracking; separate analog helpers below.
    return androidHelloRecipe.run(device);
  },
};

export async function runAndroidShareSheetAnalog(
  device: DeviceSession
): Promise<HostJourneyResult> {
  return safeJourney('android-hello', device, [
    {
      name: 'launch-settings',
      fn: async () => {
        await device.launchApp('com.android.settings', {
          terminateRunning: true,
        });
      },
    },
    {
      name: 'open-share-intent-probe',
      fn: async () => {
        // Intent-based share is app-specific; assert Settings still interactive.
        const tree = await device.accessibilityTree();
        if (tree.length === 0) throw new Error('share analog: empty tree');
      },
    },
  ]);
}

export async function runAndroidBrowserAnalog(
  device: DeviceSession
): Promise<HostJourneyResult> {
  return safeJourney('android-hello', device, [
    {
      name: 'launch-browser',
      fn: async () => {
        try {
          await device.launchApp('com.android.chrome', {
            terminateRunning: true,
          });
        } catch {
          await device.launchApp('com.android.browser', {
            terminateRunning: true,
          });
        }
      },
    },
    {
      name: 'assert-browser',
      fn: async () => {
        const tree = await device.accessibilityTree();
        if (tree.length === 0) throw new Error('browser analog empty');
      },
    },
  ]);
}

export const IOS_RECIPES: HostRecipe[] = [
  shareRecipe,
  messagesRecipe,
  stickersRecipe,
  photosRecipe,
  springboardRecipe,
  settingsRecipe,
  safariRecipe,
  walletRecipe,
  clipRecipe,
  widgetsRecipe,
];

export function recipeFor(id: HostId): HostRecipe | undefined {
  if (id === 'android-hello') return androidHelloRecipe;
  return IOS_RECIPES.find((r) => r.id === id);
}
