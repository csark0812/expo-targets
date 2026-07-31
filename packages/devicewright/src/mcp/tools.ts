/**
 * MCP tool registration — kept separate so createDevicewrightMcpServer stays small.
 */

import fs from 'node:fs';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  assertSafeBundleId,
  assertSafeOutputPath,
  assertSafePath,
} from '../allowlist';
import { devices } from '../devices';
import { formatDoctor, runDoctor } from '../doctor';
import { openSimulatorApp } from '../ios/simctl';
import type { DeviceSession } from '../session';
import {
  discoverBootedSimId,
  type SessionRegistry,
} from './sessions';

function textResult(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function jsonResult(value: unknown) {
  return textResult(JSON.stringify(value, null, 2));
}

function optDuration(
  duration: string | number | undefined
): number | undefined {
  if (duration === undefined) return;
  return typeof duration === 'number' ? duration : Number(duration);
}

async function withDevice(
  registry: SessionRegistry,
  platform: 'ios' | 'android' | undefined,
  udid: string | undefined,
  // MCP tool handlers return heterogeneous content shapes (text/image).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: (s: DeviceSession) => Promise<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  if (platform === 'android') {
    const s = await devices.launch({ platform: 'android', deviceId: udid });
    try {
      return await fn(s);
    } finally {
      await s.close();
    }
  }
  const session = await registry.ensureDevice(udid);
  return registry.runExclusive(session.deviceId, fn);
}

export function registerDevicewrightTools(
  server: McpServer,
  registry: SessionRegistry
): void {
  server.registerTool(
    'doctor',
    {
      description: 'Preflight: Xcode, simctl, idb, simulators, adb.',
      inputSchema: { requireAndroid: z.boolean().optional() },
    },
    async ({ requireAndroid }) =>
      textResult(formatDoctor(runDoctor({ requireAndroid })))
  );

  server.registerTool(
    'get_booted_sim_id',
    {
      description:
        'Discovery-only: return the booted simulator UDID when exactly one is booted. Does not attach, lock, or mutate the session registry. If multiple are booted, use list_booted_sims and pass udid to other tools.',
      inputSchema: {},
    },
    async () => jsonResult({ udid: discoverBootedSimId() })
  );

  server.registerTool(
    'list_booted_sims',
    {
      description:
        'List booted iOS simulators and whether this MCP process currently holds a session (map membership, not liveness).',
      inputSchema: {},
    },
    async () => jsonResult({ sims: registry.listBootedWithHeld() })
  );

  server.registerTool(
    'close_device',
    {
      description:
        'Close the MCP session for a UDID: drain in-flight work (default 30s) then unlock. Force-close returns DEVICE_CLOSE_FORCED if drain times out.',
      inputSchema: {
        udid: z.string(),
        drain_ms: z.number().optional(),
      },
    },
    async ({ udid, drain_ms }) =>
      jsonResult(await registry.closeDevice(udid, drain_ms ?? 30_000))
  );

  server.registerTool(
    'open_simulator',
    { description: 'Opens the iOS Simulator application', inputSchema: {} },
    async () => {
      openSimulatorApp();
      return textResult('opened Simulator');
    }
  );

  registerUiTools(server, registry);
  registerAppTools(server, registry);
}

function registerUiTools(server: McpServer, registry: SessionRegistry): void {
  server.registerTool(
    'ui_describe_all',
    {
      description: 'Describes accessibility information for the entire screen',
      inputSchema: {
        udid: z.string().optional(),
        platform: z.enum(['ios', 'android']).optional(),
      },
    },
    async ({ udid, platform }) =>
      withDevice(registry, platform, udid, async (s) =>
        jsonResult(await s.accessibilityTree())
      )
  );

  server.registerTool(
    'ui_tap',
    {
      description: 'Tap on the screen',
      inputSchema: {
        x: z.number(),
        y: z.number(),
        duration: z.union([z.string(), z.number()]).optional(),
        udid: z.string().optional(),
        platform: z.enum(['ios', 'android']).optional(),
      },
    },
    async ({ x, y, duration, udid, platform }) =>
      withDevice(registry, platform, udid, async (s) => {
        await s.tap({ x, y, duration: optDuration(duration) });
        return textResult(`tapped (${x}, ${y})`);
      })
  );

  server.registerTool(
    'ui_type',
    {
      description: 'Input text into the device',
      inputSchema: {
        text: z.string(),
        udid: z.string().optional(),
        platform: z.enum(['ios', 'android']).optional(),
      },
    },
    async ({ text, udid, platform }) =>
      withDevice(registry, platform, udid, async (s) => {
        await s.type(text);
        return textResult('typed');
      })
  );

  server.registerTool(
    'ui_swipe',
    {
      description: 'Swipe on the screen',
      inputSchema: {
        x_start: z.number(),
        y_start: z.number(),
        x_end: z.number(),
        y_end: z.number(),
        duration: z.union([z.string(), z.number()]).optional(),
        delta: z.number().optional(),
        udid: z.string().optional(),
        platform: z.enum(['ios', 'android']).optional(),
      },
    },
    async (args) =>
      withDevice(registry, args.platform, args.udid, async (s) => {
        await s.swipe({
          xStart: args.x_start,
          yStart: args.y_start,
          xEnd: args.x_end,
          yEnd: args.y_end,
          duration: optDuration(args.duration),
          delta: args.delta,
        });
        return textResult('swiped');
      })
  );

  server.registerTool(
    'ui_describe_point',
    {
      description: 'Returns the accessibility element at coordinates',
      inputSchema: {
        x: z.number(),
        y: z.number(),
        udid: z.string().optional(),
      },
    },
    async ({ x, y, udid }) =>
      withDevice(registry, 'ios', udid, async (s) =>
        jsonResult(await s.describePoint(x, y))
      )
  );

  server.registerTool(
    'ui_find_element',
    {
      description: 'Search the accessibility tree for matching elements',
      inputSchema: {
        search: z.array(z.string()),
        type: z.string().optional(),
        matchMode: z.enum(['substring', 'exact']).optional(),
        caseSensitive: z.boolean().optional(),
        udid: z.string().optional(),
        platform: z.enum(['ios', 'android']).optional(),
      },
    },
    async (args) =>
      withDevice(registry, args.platform, args.udid, async (s) =>
        jsonResult(
          await s.findElements({
            search: args.search,
            type: args.type,
            matchMode: args.matchMode,
            caseSensitive: args.caseSensitive,
          })
        )
      )
  );

  server.registerTool(
    'ui_view',
    {
      description: 'Get a screenshot of the current device view (base64 png)',
      inputSchema: {
        udid: z.string().optional(),
        platform: z.enum(['ios', 'android']).optional(),
      },
    },
    async ({ udid, platform }) =>
      withDevice(registry, platform, udid, async (s) => {
        const shot = await s.screenshot();
        const buf =
          typeof shot === 'string' ? fs.readFileSync(shot) : Buffer.from(shot);
        return {
          content: [
            {
              type: 'image' as const,
              data: buf.toString('base64'),
              mimeType: 'image/png',
            },
          ],
        };
      })
  );

  server.registerTool(
    'screenshot',
    {
      description: 'Takes a screenshot and saves it to output_path',
      inputSchema: {
        output_path: z.string(),
        udid: z.string().optional(),
        type: z.enum(['png', 'jpeg']).optional(),
        platform: z.enum(['ios', 'android']).optional(),
      },
    },
    async ({ output_path, udid, type, platform }) =>
      withDevice(registry, platform, udid, async (s) => {
        const out = assertSafeOutputPath(output_path);
        const saved = await s.screenshot({ path: out, type });
        return textResult(`saved ${saved}`);
      })
  );
}

function registerAppTools(server: McpServer, registry: SessionRegistry): void {
  server.registerTool(
    'install_app',
    {
      description: 'Installs an app bundle (.app / .ipa / .apk)',
      inputSchema: {
        app_path: z.string(),
        udid: z.string().optional(),
        platform: z.enum(['ios', 'android']).optional(),
      },
    },
    async ({ app_path, udid, platform }) =>
      withDevice(registry, platform, udid, async (s) => {
        const app = assertSafePath(app_path, { mustExist: true });
        await s.install(app);
        return textResult(`installed ${app}`);
      })
  );

  server.registerTool(
    'launch_app',
    {
      description: 'Launches an app by bundle identifier / package name',
      inputSchema: {
        bundle_id: z.string(),
        udid: z.string().optional(),
        terminate_running: z.boolean().optional(),
        platform: z.enum(['ios', 'android']).optional(),
      },
    },
    async ({ bundle_id, udid, terminate_running, platform }) =>
      withDevice(registry, platform, udid, async (s) => {
        const id = assertSafeBundleId(bundle_id);
        await s.launchApp(id, { terminateRunning: terminate_running });
        return textResult(`launched ${id}`);
      })
  );

  server.registerTool(
    'record_video',
    {
      description: 'Records simulator video via simctl (iOS simulator only).',
      inputSchema: {
        output_path: z.string().optional(),
        udid: z.string().optional(),
      },
    },
    async () =>
      textResult(
        'record_video: use xcrun simctl io <udid> recordVideo via Devicewright test runner traces for now'
      )
  );

  server.registerTool(
    'stop_recording',
    { description: 'Stops simulator video recording', inputSchema: {} },
    async () =>
      textResult('stop_recording: no-op unless a recorder was started')
  );
}
