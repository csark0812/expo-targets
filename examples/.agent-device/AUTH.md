# agent-device operator credentials

`agent-device` is pinned to the public `v0.21.15-et.1` fork release asset. A
plain `bun install --frozen-lockfile` requires no private registry token. Its
commit and integrity are recorded in `fork-provenance.json`.

The credentials below are optional and operator-only. They are required only
for the remote notification rows that prove APNs or FCM delivery. Never commit
credential files or their contents.

## APNs Sandbox (iOS notification-service green)

Use an Apple Push Notification authentication key that can send to the installed
Release host's bundle identifier. The suite obtains the device token from the
host UI and sends a nonce-bearing Sandbox push through agent-device.

```bash
# root .env
APNS_AUTH_KEY_PATH=/absolute/path/to/AuthKey_KEYID.p8
APNS_KEY_ID=your-key-id
APNS_TEAM_ID=your-team-id
# Optional override when the installed host topic differs from the catalog:
# APNS_TOPIC=com.expotargets.example.notification-service
```

`APPLE_TEAM_ID` is accepted as an alias for `APNS_TEAM_ID`. Missing or unreadable
credentials produce an operator result. A successful APNs response is transport
evidence only: green still requires the visible nonce plus `[expo-targets]` on
the Lock Screen and matching App Group state.

## FCM (Android notification shade green)

Operator-only. Mirror APNs — never commit service-account JSON or `google-services.json` with secrets.

```bash
# root .env
FCM_SERVICE_ACCOUNT_PATH=/absolute/path/to/firebase-adminsdk.json
FCM_PROJECT_ID=your-firebase-project-id
```

The suite also accepts `GOOGLE_APPLICATION_CREDENTIALS` as an alias for the service-account path.

Examples `notification-service` / `notification-content` need Firebase Messaging at runtime (`expo-notifications` + app `google-services.json`) so the host can show an FCM registration token on AX (`text-device-push-token`). Missing `FCM_*` produces an operator result. The product's local NotificationCompat path remains available, but it is not a parity oracle; README `§` stays until FCM + shade greens.

**Manifest note:** `expo-targets` registers `ExpoTargetsFcmMessagingService` for `com.google.firebase.MESSAGING_EVENT`. Android delivers FCM to one MessagingService. If `expo-notifications` also registers a service, confirm the merged manifest routes data payloads to `ExpoTargetsFcmMessagingService` (or deepen a single service that calls `ExpoTargetsNotificationRouter`). Data-only FCM payloads with `title` / `body` / `expo_targets_kind` are the supported shape.
