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

Point Cursor at the workspace MCP (replaces `ios-simulator-mcp` after hardening):

```json
{
  "mcpServers": {
    "devicewright": {
      "command": "bun",
      "args": ["run", "--filter", "@expo-targets/devicewright", "mcp"],
      "env": {
        "DEVICEWRIGHT_IDB_PATH": "/path/to/idb"
      }
    }
  }
}
```

**Rollback:** restore `npx -y ios-simulator-mcp` (+ `IOS_SIMULATOR_MCP_IDB_PATH`).

Tool names stay compatible with `ios-simulator-mcp` (`ui_tap`, `ui_describe_all`, `screenshot`, …) plus `doctor` and optional `platform: android`.

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
