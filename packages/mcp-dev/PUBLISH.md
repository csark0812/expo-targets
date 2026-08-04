# Publish @csark0812/mcp-dev

Public scoped package. CI uses **trusted publishing (OIDC)** — no long-lived `NPM_TOKEN` for publish.

Unscoped `mcp-dev` is blocked by npm (too similar to `mcpdev`). Always publish as `@csark0812/mcp-dev`.

## Trusted Publisher (paste these exact values)

On https://www.npmjs.com/package/@csark0812/mcp-dev → **Settings** → **Trusted Publisher** → **GitHub Actions**:

| Field | Value |
| --- | --- |
| Organization or user | `csark0812` |
| Repository | `expo-targets` |
| Workflow filename | `publish-mcp-dev.yml` |
| Environment | _(leave empty)_ |

Workflow path in repo: `.github/workflows/publish-mcp-dev.yml` — npm wants the **filename only**.

## After attaching

1. Merge the scoped-name CI fix to `main` (so the workflow on default branch matches).
2. **Actions → publish-mcp-dev → Run workflow**.
3. Leave **version** empty to patch-bump (`0.1.1` → `0.1.2`) so the next release restores a valid `bin` (the bootstrap `0.1.1` tarball had `bin` stripped).

## Local emergency publish

Only if OIDC is broken and you are logged in as `csark0812`:

```bash
cd packages/mcp-dev
bun run build
test -f build/bin/mcp-dev.js
npm publish --access public --ignore-scripts
```
