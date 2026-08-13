# Spike: Android RN Share/Action Activity TTI

**Date:** 2026-08-10  
**Wave:** Track 1 (retire README `‡`)  
**Owner:** eng  
**Follows:** [android-rn-host-2026-08-05.md](./android-rn-host-2026-08-05.md)

## Question

Does `ExpoTargetsReactTargetActivity` (live RN host when `entry` is set) meet the ~2s mid-tier emulator cold-start falsifier for share/action?

## Steps tried

1. Emulator: `emulator-5554` (`sdk_gphone64_arm64`).
2. Force-stop host, then `am start -W` with `ACTION_SEND` / `PROCESS_TEXT` into the RN deepen Activities.
3. Confirm interactive chrome via uiautomator (`Save` / `Open main app` / `Cancel` + shared text).

## Evidence

| Surface | Activity | TotalTime (ms) | Notes |
| --- | --- | --- | --- |
| share (cold) | `com.expotargets.example.share/.target.share.ShareShareActivity` | **702** | First force-stop run |
| share (repeat) | same | 279, 318 | Subsequent force-stop runs |
| action (cold) | `com.expotargets.example.action/.target.action.ActionActionActivity` | **570** | Force-stop then PROCESS_TEXT |

Falsifier: mid-tier cold start to interactive **> ~2s** → NO-GO. Measured max cold TotalTime **702 ms** (share) / **570 ms** (action). Interactive labels present after start.

## Decision

**GO** — RN `entry` host on Android is production for share/action.

- Host class: `ExpoTargetsReactTargetActivity` (+ `ExpoTargetsReactShareActivity` / `ExpoTargetsReactActionActivity`).
- Spike 2026-08-05 “fallback note / provisional” language is obsolete.
- Retire “RN provisional” in docs; README `‡` still waits on FCM track per showcase scrub gate.

## Duration

~15 minutes operator TTI measurement.
