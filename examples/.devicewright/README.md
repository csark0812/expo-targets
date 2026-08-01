# Devicewright example suite (consumer)

Owns REQUIRED_V1 journeys for public `examples/*`. Devicewright (`@csark0812/devicewright`) is the private npm library that runs them.

## Layout (Maestro parallel)

| Maestro                              | Devicewright                              |
| ------------------------------------ | ----------------------------------------- |
| `examples/share/.maestro/smoke.yaml` | `examples/share/.devicewright/journey.ts` |
| `examples/.maestro/subflows/`        | `examples/.devicewright/` (shared)        |
| `examples:maestro:share`             | `examples:devicewright:share`             |

## Private dependency

```bash
export NODE_AUTH_TOKEN=…   # read access to private @csark0812/devicewright
bun install
```

See [AUTH.md](./AUTH.md).

## Release install (required for share/action/messages bars)

Debug binaries are an **operator** fail. For each REQUIRED_V1 example:

```bash
cd examples/share   # or action|messages|…
bun install
npx expo prebuild --platform ios
npx expo run:ios --configuration Release
```

### Opt-in ensure-install

Pass `--ensure-install` so the matrix Release-builds any missing host before its journey (skips when already on the sim). First full run can take a long time (minutes × up to 8 apps).

```bash
bun examples/.devicewright/cli.ts matrix --ids=share --ensure-install --no-fail-fast
bun run examples:devicewright:matrix:ensure   # live-through=3, all rows, --no-fail-fast
```

Without the flag, missing hosts stay an operator/infra fail (no builds).

### iOS 26.5+ accessibility

`@csark0812/devicewright@^0.1.3` sets `IgnoreAXServerEntitlements` in `doctor` / `devices.launch`. Empty `Application {0×0}` from idb usually means an older DW or a sim that needs a SpringBoard refresh — run dry-preflight / relaunch.

## dry-preflight + matrix

```bash
bun examples/.devicewright/cli.ts dry-preflight
bun examples/.devicewright/cli.ts matrix --stubs-only
bun examples/.devicewright/cli.ts matrix --live-through=1
```

Or root scripts: `bun run examples:devicewright:dry-preflight`, `examples:devicewright:matrix`, etc.

## Artifacts

Run output: `examples/.devicewright/artifacts/` (gitignored except committed spikes under `artifacts/spikes/`).
