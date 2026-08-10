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

## FCM (Android notification shade green)

Operator-only. Mirror APNs — never commit service-account JSON or `google-services.json` with secrets.

```bash
# root .env
FCM_SERVICE_ACCOUNT_PATH=/absolute/path/to/firebase-adminsdk.json
FCM_PROJECT_ID=your-firebase-project-id
```

Devicewright also accepts `GOOGLE_APPLICATION_CREDENTIALS` as an alias for the service-account path.

Examples `notification-service` / `notification-content` need Firebase Messaging at runtime (`expo-notifications` + app `google-services.json`) so the host can show an FCM registration token on AX (`text-device-push-token`). Missing `FCM_*` → journeys fall back to the local NotificationCompat path; README `§` stays until FCM + shade greens.

**Manifest note:** `expo-targets` registers `ExpoTargetsFcmMessagingService` for `com.google.firebase.MESSAGING_EVENT`. Android delivers FCM to one MessagingService. If `expo-notifications` also registers a service, confirm the merged manifest routes data payloads to `ExpoTargetsFcmMessagingService` (or deepen a single service that calls `ExpoTargetsNotificationRouter`). Data-only FCM payloads with `title` / `body` / `expo_targets_kind` are the supported shape.
