# Installing private `@csark0812/devicewright`

This public repo depends on a **private npmjs** package published from device-plane (`^0.1.0`).

## After first publish

1. Obtain a token with **read** access to `@csark0812/devicewright`.
2. Put it in root `.env` (see `.env.example`) or export before install / CI:

```bash
# preferred locally — copy .env.example → .env
NODE_AUTH_TOKEN=<npm_token>

# or one-off
export NODE_AUTH_TOKEN=<npm_token>
bun install
```

3. Root `.npmrc` uses `${NODE_AUTH_TOKEN}` (no committed secrets).

Fork PRs without the token should skip `examples:devicewright:*` jobs.

## Before first publish (local only)

Do **not** commit a `file:` dependency. For local verification until CI publishes:

```bash
# in device-plane/packages/devicewright
bun link
# in expo-targets
bun link @csark0812/devicewright
```

Publish / CI: device-plane `packages/devicewright/PUBLISH.md` + workflow `publish-devicewright`.
