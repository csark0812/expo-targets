/**
 * MCP tool registration — kept separate so createDevicewrightMcpServer stays small.
 */

import fs from "node:fs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  assertSafeBundleId,
  assertSafeDeviceId,
  assertSafeOutputPath,
  assertSafePath,
} from "../allowlist";
import { devices } from "../devices";
import { formatDoctor, runDoctor } from "../doctor";
import { openSimulatorApp } from "../ios/simctl";
import { deleteFrameFiles } from "../media/frames";
import type { DeviceSession } from "../session";
import {
  discoverBootedSimId,
  listBootedSimulators,
  resolveMcpSimulatorId,
  type SessionRegistry,
} from "./sessions";

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function jsonResult(value: unknown) {
  return textResult(JSON.stringify(value, null, 2));
}

function optDuration(
  duration: string | number | undefined,
): number | undefined {
  if (duration === undefined) return;
  return typeof duration === "number" ? duration : Number(duration);
}

async function withDevice(
  registry: SessionRegistry,
  platform: "ios" | "android" | undefined,
  udid: string | undefined,
  // MCP tool handlers return heterogeneous content shapes (text/image).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: (s: DeviceSession) => Promise<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  if (platform === "android") {
    const s = await devices.launch({ platform: "android", deviceId: udid });
    try {
      return await fn(s);
    } finally {
      await s.close();
    }
  }
  const session = await registry.ensureDevice(udid);
  return registry.runExclusive(session.deviceId, fn);
}

/**
 * Soft-omit for stop/view: require udid when >1 held OR multi-booted.
 */
function resolveRecordingSessionUdid(
  registry: SessionRegistry,
  udid?: string,
): string {
  if (udid) return assertSafeDeviceId(udid);
  const held = registry.heldIds();
  if (held.length > 1) {
    throw new Error(
      `multiple held sessions; pass udid. Held: ${held.join(", ")}. Use list_booted_sims.`,
    );
  }
  if (held.length === 1) {
    const booted = listBootedSimulators();
    if (booted.length > 1) {
      // Prefer the held session when multi-booted but only one held.
      return held[0]!;
    }
    return held[0]!;
  }
  return resolveMcpSimulatorId();
}

export function registerDevicewrightTools(
  server: McpServer,
  registry: SessionRegistry,
): void {
  server.registerTool(
    "doctor",
    {
      description: "Preflight: Xcode, simctl, idb, simulators, adb.",
      inputSchema: { requireAndroid: z.boolean().optional() },
    },
    async ({ requireAndroid }) =>
      textResult(formatDoctor(runDoctor({ requireAndroid }))),
  );

  server.registerTool(
    "get_booted_sim_id",
    {
      description:
        "Discovery-only: return the booted simulator UDID when exactly one is booted. Does not attach, lock, or mutate the session registry. If multiple are booted, use list_booted_sims and pass udid to other tools.",
      inputSchema: {},
    },
    async () => jsonResult({ udid: discoverBootedSimId() }),
  );

  server.registerTool(
    "list_booted_sims",
    {
      description:
        "List booted iOS simulators and whether this MCP process currently holds a session (map membership, not liveness).",
      inputSchema: {},
    },
    async () => jsonResult({ sims: registry.listBootedWithHeld() }),
  );

  server.registerTool(
    "close_device",
    {
      description:
        "Close the MCP session for a UDID: drain in-flight work (default 30s) then unlock. Force-close returns DEVICE_CLOSE_FORCED if drain times out.",
      inputSchema: {
        udid: z.string(),
        drain_ms: z.number().optional(),
      },
    },
    async ({ udid, drain_ms }) =>
      jsonResult(await registry.closeDevice(udid, drain_ms ?? 30_000)),
  );

  server.registerTool(
    "open_simulator",
    { description: "Opens the iOS Simulator application", inputSchema: {} },
    async () => {
      openSimulatorApp();
      return textResult("opened Simulator");
    },
  );

  registerUiTools(server, registry);
  registerAppTools(server, registry);
}

function registerUiTools(server: McpServer, registry: SessionRegistry): void {
  server.registerTool(
    "ui_describe_all",
    {
      description: "Describes accessibility information for the entire screen",
      inputSchema: {
        udid: z.string().optional(),
        platform: z.enum(["ios", "android"]).optional(),
      },
    },
    async ({ udid, platform }) =>
      withDevice(registry, platform, udid, async (s) =>
        jsonResult(await s.accessibilityTree()),
      ),
  );

  server.registerTool(
    "ui_tap",
    {
      description: "Tap on the screen",
      inputSchema: {
        x: z.number(),
        y: z.number(),
        duration: z.union([z.string(), z.number()]).optional(),
        udid: z.string().optional(),
        platform: z.enum(["ios", "android"]).optional(),
      },
    },
    async ({ x, y, duration, udid, platform }) =>
      withDevice(registry, platform, udid, async (s) => {
        await s.tap({ x, y, duration: optDuration(duration) });
        return textResult(`tapped (${x}, ${y})`);
      }),
  );

  server.registerTool(
    "ui_type",
    {
      description: "Input text into the device",
      inputSchema: {
        text: z.string(),
        udid: z.string().optional(),
        platform: z.enum(["ios", "android"]).optional(),
      },
    },
    async ({ text, udid, platform }) =>
      withDevice(registry, platform, udid, async (s) => {
        await s.type(text);
        return textResult("typed");
      }),
  );

  server.registerTool(
    "ui_swipe",
    {
      description: "Swipe on the screen",
      inputSchema: {
        x_start: z.number(),
        y_start: z.number(),
        x_end: z.number(),
        y_end: z.number(),
        duration: z.union([z.string(), z.number()]).optional(),
        delta: z.number().optional(),
        udid: z.string().optional(),
        platform: z.enum(["ios", "android"]).optional(),
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
        return textResult("swiped");
      }),
  );

  server.registerTool(
    "ui_press_key",
    {
      description:
        "Press a key via idb (named: enter|return|escape|delete|backspace|tab|space, or numeric HID keycode). iOS only.",
      inputSchema: {
        key: z.string(),
        duration: z.union([z.string(), z.number()]).optional(),
        udid: z.string().optional(),
        platform: z.enum(["ios", "android"]).optional(),
      },
    },
    async ({ key, duration, udid, platform }) => {
      if (platform === "android") {
        return textResult(
          "ui_press_key: Android not supported yet. Use platform: ios.",
        );
      }
      return withDevice(registry, "ios", udid, async (s) => {
        await s.pressKey({ key, duration: optDuration(duration) });
        return textResult(`pressed key ${key}`);
      });
    },
  );

  server.registerTool(
    "ui_press_button",
    {
      description:
        "Press a hardware button via idb: APPLE_PAY|HOME|LOCK|SIDE_BUTTON|SIRI. iOS only.",
      inputSchema: {
        button: z.string(),
        duration: z.union([z.string(), z.number()]).optional(),
        udid: z.string().optional(),
        platform: z.enum(["ios", "android"]).optional(),
      },
    },
    async ({ button, duration, udid, platform }) => {
      if (platform === "android") {
        return textResult(
          "ui_press_button: Android not supported yet. Use platform: ios.",
        );
      }
      return withDevice(registry, "ios", udid, async (s) => {
        await s.pressButton({ button, duration: optDuration(duration) });
        return textResult(`pressed button ${button}`);
      });
    },
  );

  server.registerTool(
    "ui_shake",
    {
      description:
        "Shake the iOS Simulator (Simulator.app Device → Shake; idb has no shake). Requires Simulator focused; may need Accessibility for System Events.",
      inputSchema: {
        udid: z.string().optional(),
        platform: z.enum(["ios", "android"]).optional(),
      },
    },
    async ({ udid, platform }) => {
      if (platform === "android") {
        return textResult(
          "ui_shake: Android not supported yet. Use platform: ios.",
        );
      }
      return withDevice(registry, "ios", udid, async (s) => {
        await s.shake();
        return textResult("shook");
      });
    },
  );

  server.registerTool(
    "ui_describe_point",
    {
      description: "Returns the accessibility element at coordinates",
      inputSchema: {
        x: z.number(),
        y: z.number(),
        udid: z.string().optional(),
      },
    },
    async ({ x, y, udid }) =>
      withDevice(registry, "ios", udid, async (s) =>
        jsonResult(await s.describePoint(x, y)),
      ),
  );

  server.registerTool(
    "ui_find_element",
    {
      description: "Search the accessibility tree for matching elements",
      inputSchema: {
        search: z.array(z.string()),
        type: z.string().optional(),
        matchMode: z.enum(["substring", "exact"]).optional(),
        caseSensitive: z.boolean().optional(),
        udid: z.string().optional(),
        platform: z.enum(["ios", "android"]).optional(),
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
          }),
        ),
      ),
  );

  server.registerTool(
    "ui_view",
    {
      description: "Get a screenshot of the current device view (base64 png)",
      inputSchema: {
        udid: z.string().optional(),
        platform: z.enum(["ios", "android"]).optional(),
      },
    },
    async ({ udid, platform }) =>
      withDevice(registry, platform, udid, async (s) => {
        const shot = await s.screenshot();
        const buf =
          typeof shot === "string" ? fs.readFileSync(shot) : Buffer.from(shot);
        return {
          content: [
            {
              type: "image" as const,
              data: buf.toString("base64"),
              mimeType: "image/png",
            },
          ],
        };
      }),
  );

  server.registerTool(
    "screenshot",
    {
      description: "Takes a screenshot and saves it to output_path",
      inputSchema: {
        output_path: z.string(),
        udid: z.string().optional(),
        type: z.enum(["png", "jpeg"]).optional(),
        platform: z.enum(["ios", "android"]).optional(),
      },
    },
    async ({ output_path, udid, type, platform }) =>
      withDevice(registry, platform, udid, async (s) => {
        const out = assertSafeOutputPath(output_path);
        const saved = await s.screenshot({ path: out, type });
        return textResult(`saved ${saved}`);
      }),
  );
}

function registerAppTools(server: McpServer, registry: SessionRegistry): void {
  server.registerTool(
    "install_app",
    {
      description: "Installs an app bundle (.app / .ipa / .apk)",
      inputSchema: {
        app_path: z.string(),
        udid: z.string().optional(),
        platform: z.enum(["ios", "android"]).optional(),
      },
    },
    async ({ app_path, udid, platform }) =>
      withDevice(registry, platform, udid, async (s) => {
        const app = assertSafePath(app_path, { mustExist: true });
        await s.install(app);
        return textResult(`installed ${app}`);
      }),
  );

  server.registerTool(
    "launch_app",
    {
      description: "Launches an app by bundle identifier / package name",
      inputSchema: {
        bundle_id: z.string(),
        udid: z.string().optional(),
        terminate_running: z.boolean().optional(),
        platform: z.enum(["ios", "android"]).optional(),
      },
    },
    async ({ bundle_id, udid, terminate_running, platform }) =>
      withDevice(registry, platform, udid, async (s) => {
        const id = assertSafeBundleId(bundle_id);
        await s.launchApp(id, { terminateRunning: terminate_running });
        return textResult(`launched ${id}`);
      }),
  );

  server.registerTool(
    "record_video",
    {
      description:
        "Start iOS Simulator screen recording (simctl). Optional max_seconds auto-stops. While recording, DW/idb actions are journaled to a sibling .actions.json on stop. Android not supported yet.",
      inputSchema: {
        output_path: z.string().optional(),
        udid: z.string().optional(),
        max_seconds: z.number().optional(),
        platform: z.enum(["ios", "android"]).optional(),
      },
    },
    async ({ output_path, udid, max_seconds, platform }) => {
      if (platform === "android") {
        return textResult(
          "record_video: Android screen recording is not supported yet in Devicewright (deferred). Use platform: ios.",
        );
      }
      return withDevice(registry, "ios", udid, async (s) => {
        const handle = await s.startRecording({
          path: output_path ? assertSafeOutputPath(output_path) : undefined,
          maxSeconds: max_seconds,
        });
        return textResult(`recording → ${handle.path}`);
      });
    },
  );

  server.registerTool(
    "stop_recording",
    {
      description:
        "Stop iOS Simulator screen recording and return the DW act journal co-recorded with the video (Devicewright/idb actions only — not Simulator.app mouse HID). Returns JSON: { path, actionsPath, actions, truncated? }. Inline actions are capped at 500; if truncated is true, read actionsPath for the full journal — do not treat inline actions as complete. Pass udid when multiple sims are held or booted.",
      inputSchema: {
        udid: z.string().optional(),
        platform: z.enum(["ios", "android"]).optional(),
      },
    },
    async ({ udid, platform }) => {
      if (platform === "android") {
        return textResult(
          "stop_recording: Android screen recording is not supported yet in Devicewright (deferred).",
        );
      }
      const id = resolveRecordingSessionUdid(registry, udid);
      return withDevice(registry, "ios", id, async (s) => {
        const result = await s.stopRecording();
        const MAX_INLINE = 500;
        const truncated = result.actions.length > MAX_INLINE;
        const payload = {
          path: result.path,
          actionsPath: result.actionsPath,
          actions: truncated
            ? result.actions.slice(0, MAX_INLINE)
            : result.actions,
          ...(truncated ? { truncated: true as const } : {}),
        };
        const text = truncated
          ? `saved ${result.path}; actions truncated (${result.actions.length} total) — read full journal at ${result.actionsPath}\n${JSON.stringify(payload, null, 2)}`
          : JSON.stringify(payload, null, 2);
        return textResult(text);
      });
    },
  );

  server.registerTool(
    "ui_view_recording",
    {
      description:
        "Sample frames from a recording (default: last stopped on this session) as MCP images for animation inspection. Requires ffmpeg+ffprobe (doctor warns if missing; record/stop still work). Optional start_seconds/end_seconds zoom into a window (e.g. 200ms: fps 5–10 over a short range).",
      inputSchema: {
        path: z.string().optional(),
        fps: z.number().optional(),
        max_frames: z.number().optional(),
        start_seconds: z.number().optional(),
        end_seconds: z.number().optional(),
        udid: z.string().optional(),
        platform: z.enum(["ios", "android"]).optional(),
      },
    },
    async ({
      path: videoPath,
      fps,
      max_frames,
      start_seconds,
      end_seconds,
      udid,
      platform,
    }) => {
      if (platform === "android") {
        return textResult(
          "ui_view_recording: Android screen recording is not supported yet in Devicewright (deferred).",
        );
      }
      const id = resolveRecordingSessionUdid(registry, udid);
      return withDevice(registry, "ios", id, async (s) => {
        const viewed = await s.viewRecording({
          path: videoPath ? assertSafeOutputPath(videoPath) : undefined,
          fps,
          maxFrames: max_frames,
          startSeconds: start_seconds,
          endSeconds: end_seconds,
        });
        const summary = [
          `path=${viewed.path}`,
          `duration=${viewed.duration.toFixed(3)}s`,
          `window=[${viewed.startSeconds.toFixed(3)}, ${viewed.endSeconds.toFixed(3)}]`,
          `frameCount=${viewed.frameCount}`,
          `fps=${viewed.fps}`,
          `maxFrames=${viewed.maxFrames}`,
          `thinned=${viewed.thinned}`,
          `t=[${viewed.frames.map((f) => f.t.toFixed(3)).join(", ")}]`,
        ].join(" ");
        const content: Array<
          | { type: "text"; text: string }
          | { type: "image"; data: string; mimeType: string }
        > = [{ type: "text", text: summary }];
        try {
          for (const frame of viewed.frames) {
            const buf = fs.readFileSync(frame.path);
            content.push({
              type: "image",
              data: buf.toString("base64"),
              mimeType: "image/jpeg",
            });
          }
        } finally {
          deleteFrameFiles(viewed.outDir);
        }
        return { content };
      });
    },
  );
}
