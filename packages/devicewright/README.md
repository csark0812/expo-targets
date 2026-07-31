# @expo-targets/devicewright (Devicewright)

Playwright-shaped **device control plane** for agents (MCP) and TypeScript scripts.

> Working name **Devicewright**. Private workspace package. Extract/rename later (see [EXTRACT.md](./EXTRACT.md)).

## Audience (locked)

1. **Agents** — MCP (`devicewright-mcp`)
2. **Engineers** — `import { devices } from '@expo-targets/devicewright'`
3. **Harness / CI** — byproduct (see [HARNESS.md](./HARNESS.md))

## Install (workspace)

```bash
bun install
bun run --filter @expo-targets/devicewright build
bun run --filter @expo-targets/devicewright doctor
```

## TypeScript

```ts
import { devices } from '@expo-targets/devicewright';

const device = await devices.launch({ platform: 'ios', device: 'iPhone 16' });
await device.launchApp('com.apple.Preferences');
await device.getByText('General').tap();
await device.screenshot({ path: 'settings.png' });
await device.close();
```

Cross-OS happy path (same script shape):

```ts
const android = await devices.launch({ platform: 'android' });
await android.launchApp('com.android.settings');
await android.getByText('Settings').tap(); // or assert visible
await android.screenshot({ path: 'android-settings.png' });
await android.close();
```

## MCP

Point Cursor at the workspace MCP (replaces `ios-simulator-mcp` after hardening). Prefer an **absolute** `bun` path if `spawn bun ENOENT`:

```json
{
  "mcpServers": {
    "devicewright": {
      "command": "/Users/YOU/.bun/bin/bun",
      "args": ["run", "--filter", "@expo-targets/devicewright", "mcp"],
      "env": {
        "DEVICEWRIGHT_IDB_PATH": "/path/to/idb"
      }
    }
  }
}
```

**Host assumption:** one stdio MCP process + concurrent tools. The session registry (Map by UDID) lives in that process. Cross-process exclusive hold is the existing PID lock file (`lock: true`) — second agent/process fails loud (B1). Do not add a second Cursor MCP server entry per sim.

**Multi-sim agents (A):** omit `udid` only when exactly one simulator is booted (MCP soft-omit). With 2+ booted, pass `udid` or call `list_booted_sims`. Sessions stay warm until `close_device` or process exit (`releaseAll` unlocks **this process** only). `heldByThisMcp` is map membership (zombie OK until close if the sim dies externally).

**Soft-omit vs scripts:** MCP soft-omit is MCP-only. TS scripts / `runOnDevices` still use shared `resolveSimulatorId` (first-booted when omit). One lock plane: both use PID locks when `lock: true`.

**Rollback:** restore `npx -y ios-simulator-mcp` (+ `IOS_SIMULATOR_MCP_IDB_PATH`).

Tool names stay compatible with `ios-simulator-mcp` (`ui_tap`, `ui_describe_all`, `screenshot`, …) plus `doctor`, `list_booted_sims`, `close_device`, and optional `platform: android`.

Local multi-sim smoke (two booted sims, not CI):

```bash
bun packages/devicewright/src/examples/parallel-sessions-smoke.ts
```

## Security

- Paths and bundle IDs are allowlisted (`assertSafePath` / `assertSafeBundleId`)
- Process spawning uses structured argv only — **never** shell interpolation of agent strings
- Device UDID PID locks under `os.tmpdir()/devicewright-<id>.lock`

## Host claims (week-7 bar)

Must keep: Share, Messages, Photos, SpringBoard, Settings, Safari.  
Cut first if behind: Wallet → App Clip → widgets → Stickers; Android hello-path cut if red.

```bash
bun run --filter @expo-targets/devicewright cli -- claims
bun run --filter @expo-targets/devicewright cli -- matrix
```

## CI posture

macOS-local / agent MCP. **Not** a Ubuntu merge gate. Physical/cloud APIs exist (`physicalLaunchOptions`, `registerCloudAdapter`) but are not the week-7 merge bar.

## Package layout

Single workspace package today (plan allows collapse). Subpath exports:

- `@expo-targets/devicewright` — core session / devices / doctor / MCP helpers
- `@expo-targets/devicewright/ios`
- `@expo-targets/devicewright/android`
- `@expo-targets/devicewright/test`
- `@expo-targets/devicewright/hosts`
