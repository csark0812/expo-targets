# Devicewright example suite (consumer)

Owns REQUIRED_V1 journeys for public `examples/*`. Devicewright (`@csark0812/devicewright`) is the private npm library that runs them.

## Layout (Maestro parallel)

| Maestro | Devicewright |
|---------|----------------|
| `examples/share/.maestro/smoke.yaml` | `examples/share/.devicewright/journey.ts` |
| `examples/.maestro/subflows/` | `examples/.devicewright/` (shared) |
| `examples:maestro:share` | `examples:devicewright:share` |

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

## dry-preflight + matrix

```bash
bun examples/.devicewright/cli.ts dry-preflight
bun examples/.devicewright/cli.ts matrix --stubs-only
bun examples/.devicewright/cli.ts matrix --live-through=1
```

Or root scripts: `bun run examples:devicewright:dry-preflight`, `examples:devicewright:matrix`, etc.

## Artifacts

Run output: `examples/.devicewright/artifacts/` (gitignored except committed spikes under `artifacts/spikes/`).
