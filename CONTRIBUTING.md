# Contributing

**Source of truth for** human contributors (install, CI, Biome, release).

<!-- doc-meta: owner=eng | last-reviewed=2026-08-05 -->

Agents: start with [AGENTS.md](./AGENTS.md), then this file for install/CI/release detail.

## Prerequisites

- **Bun** (workspace package manager)
- **Node ≥ 22** (publish / OIDC tooling)
- **macOS + Xcode** only when running example hosts / Devicewright
- **`NODE_AUTH_TOKEN`** — required to install private `@csark0812/devicewright@0.1.14`. See [examples/.devicewright/AUTH.md](./examples/.devicewright/AUTH.md) and root `.env.example`.

The root `package.json` `"version"` field is vestigial (private workspace); the published version lives on `packages/expo-targets`.

## Install → build

```bash
export NODE_AUTH_TOKEN=…   # or put it in .env
bun install
bun run build
```

## CI gate (must stay green)

Matches [`.github/workflows/test.yml`](./.github/workflows/test.yml):

| Check | Command |
| --- | --- |
| Lint | `bunx biome ci . --error-on-warnings` |
| Types | `bun run typecheck` |
| Unit (L1/L2) | `bun run test:unit` |
| Integration (L3) | `bun run test:integration` |
| Build | `bun run build` |
| Secrets | gitleaks (CI action) |

Devicewright operator matrix is **not** CI-gated — see [examples/.devicewright/PR_PROOF.md](./examples/.devicewright/PR_PROOF.md).

## Biome budgets

Enforced via Biome (see `biome.json`):

| Rule | Budget |
| --- | --- |
| `noExcessiveCognitiveComplexity` | 10 |
| lines per function | 40 |
| max params | 3 |
| nested callbacks | 3 |

Exemptions: `examples/.devicewright/**`, `scripts/**` (and any paths Biome already ignores). Prefer extracting helpers over raising budgets.

## Test taxonomy

| Level | Where | CI? |
| --- | --- | --- |
| L1/L2 unit | Colocated `*.test.ts` under packages | Yes (`test:unit`) |
| L3 integration | `*.integration.test.ts` (pbx pipeline, Linux) | Yes (`test:integration`) |
| Devicewright | `examples/.devicewright/` journeys | Operator-only |

## Generated / sealed trees

- Do **not** commit generated `ios/` or `android/` from example prebuilds.
- Never edit `ios/*/ExpoTargetsGenerated/` — sealed CNG output (gitignored). Deepen under `targets/*/ios/`.

## Docs

Canonical files: [`.skeleton/registry.md`](./.skeleton/registry.md). After doc edits:

```bash
bun run audit:self
bun run validate:changed
```

## Pull requests

- Prefer focused PRs; docs truth + fences can ship together when they are one refresh.
- Labels **`major`** / **`minor`** on the PR drive publish semver on merge to `main` (else **patch**). See Release below.

## Release

Publishing is [`.github/workflows/publish.yml`](./.github/workflows/publish.yml):

- Triggers on **merged PR to `main`** or **`workflow_dispatch`** (optional explicit version / bump type).
- Uses npm **trusted publishers** + OIDC (`id-token: write`) — no long-lived npm token for publish.
- **Publishes:** `expo-targets` (includes `npx expo-targets add|doctor|generate|sync|…`).
- **Does not publish separately:** `@expo-targets/cli` workspace package (dev mirror).
- Semver from PR labels: `major` → major, `minor` → minor, else patch. Manual dispatch can set version or bump type.
- Bumps package version, tags `v*`, builds, then `npm publish`.
- **Legacy `create-expo-target`:** removed from the monorepo. After this lands, publish a one-shot redirect tarball from a throwaway folder (`npx create-expo-target` → print “use `npx expo-targets add`” + exit 1). Not kept in-repo.

`NODE_AUTH_TOKEN` in CI is still required for **install** of private Devicewright during the publish job’s `bun install`.

## Related

- [AGENTS.md](./AGENTS.md)
- [docs/deprecations.md](./docs/deprecations.md) — no orphan ExtensionTypes
- [packages/expo-targets/plugin/README.md](./packages/expo-targets/plugin/README.md) — Adding an ExtensionType
