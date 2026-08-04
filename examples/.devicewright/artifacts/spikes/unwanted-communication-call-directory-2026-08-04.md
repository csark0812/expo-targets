# Spike: unwanted-communication / call-directory (2026-08-04)

**Device:** iPhone Air `0E7FA53F-23B3-4F10-BAE1-AED7515401B2` · iOS 26.5  
**DW:** `@csark0812/devicewright@0.1.14`  
**Artifact:** `targets-1785869838049`

## Verdicts

| id | Status | Evidence |
| -- | ------ | -------- |
| **call-directory** | **os-limit (CLAIMS)** | pluginkit OK; Settings → Apps → Phone confirm on Call Blocking / Announce Calls times out; Settings search “Call Blocking” → surface unavailable (Air / non-telephony) |
| **unwanted-communication** | **os-limit (CLAIMS)** | pluginkit `classification-ui` OK; real `ClassificationViewController` ships; Phone → SMS/Call Reporting and Settings search (“SMS/Call Reporting”, “Call Reporting”) miss — no reporting picker / extension list on this Sim |

## call-directory — deeper probe

1. Host Release install + `pluginkit` lists `com.apple.callkit.call-directory` for `…call-directory.call-directory`.
2. Settings root has no reliable **Phone** row for Call Blocking on Air (journey falls through).
3. Settings → Apps → search **Phone** → `searchAppsAndOpen` confirm on Call Blocking / Announce Calls / Silence Unknown / Cellular **times out** (`apps-phone-settings-unavailable`).
4. Settings search **Call Blocking** → `call-blocking-settings-unavailable` (no usable result → list).
5. GREEN would need Call Blocking & Identification listing **ET CallDir Target** — not available on this Sim.

## unwanted-communication — deeper probe

1. Stub replaced with `ILClassificationUIExtensionViewController` (`ClassificationViewController`); App Group keys `uc:*` ready for invoke.
2. `pluginkit` lists `com.apple.identitylookup.classification-ui` for `…unwanted-communication.unwanted-communication`.
3. Settings → Phone path: no SMS/Call Reporting row reached on Air.
4. Settings → Apps → Phone: same confirm-label timeout as CD (Phone detail opaque / missing telephony chrome).
5. Settings search **SMS/Call Reporting** and **Call Reporting**: AX stays on Settings root (General / Accessibility / …) — no reporting picker results; `sms-call-reporting-unavailable`.
6. GREEN would need SMS/Call Reporting (or proven alias) listing **ET Unwanted Target** — not available on this Sim. Reporting UI invoke remains out of scope for P.

## Follow-ups

- Revisit both on a telephony-capable Sim / device where Phone → Call Blocking and SMS/Call Reporting exist.
- Keep CLAIMS; do not soft-green on Apps host registration alone.
