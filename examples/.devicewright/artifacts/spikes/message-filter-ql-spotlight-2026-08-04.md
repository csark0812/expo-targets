# Spike: message-filter / quicklook-preview / spotlight (2026-08-04)

**Device:** iPhone Air `0E7FA53F-23B3-4F10-BAE1-AED7515401B2` · iOS 26.5  
**DW:** `@csark0812/devicewright@0.1.14`  
**Artifacts:**
- `targets-1785863719848` — QL green / MF os-limit
- `targets-1785865324923` — QL green / MF + spotlight os-limit
- `targets-1785865835503` — MF + spotlight re-probe after journey harden + spotlight reinstall
- probe script: `spikes/probe-mf-spotlight.ts`

## Verdicts

| id | Status | Evidence |
| -- | ------ | -------- |
| **quicklook-preview** | **GREEN (P)** | Files → `et-preview.etql` → QL UI + App Group |
| **message-filter** | **os-limit (CLAIMS)** | pluginkit OK; Messages Settings AX = `Settings\|Apps\|BackButton` (blank); filter Settings search = no results; `App-prefs:MESSAGES` no-op on iOS 26 Apps Settings |
| **spotlight** | **os-limit (CLAIMS)** | Files drill-in works (`files-fixture-opened`); App Group stays `none`; Spotlight search labels untrusted without importer side-effect |

## message-filter — deeper probe

1. pluginkit lists `com.apple.identitylookup.message-filter` for `…message-filter.message-filter` / **ET MsgFilter Target**.
2. Settings → Apps → search **Messages** opens a pane whose AX is only **Settings | Apps | BackButton** (blank detail).
3. Confirm wait on Messages chrome (`iMessage`, `Send & Receive`, …) times out (point-probe) — same blank surface.
4. Global Settings search: no results for Unknown Senders / Text Message Filter / Manage Filtering / SMS Filtering.
5. `App-prefs:com.apple.MobileSMS` (iOS 18+ replacement), `App-prefs:MESSAGES`, and `App-prefs:root=MESSAGES` all miss on this Sim (`messages-deeplink-miss:*` in `targets-1785866378796`).
6. `defaults read com.apple.MobileSMS` shows first-party spam migration (`sForceSMSSpamFilteringCompleted`, `sForceUnknownFilteringCompleted`) — **no third-party IL filter enablement keys**.
7. GREEN would need filter list UI **or** inbound SMS invoke writing App Group `msgFilter:*` after enablement — neither available on this Sim.

## spotlight — deeper probe

1. Host + appex ship `UTExportedTypeDeclarations` / `CSSupportedContentTypes` = `com.expotargets.etspot`; appex binary contains `ImportExtension` + `spotlight:marker`.
2. Host-side `mdls` on the sim container path reports `dyn.*` — **misleading** (same as QL); do not use as UTI proof.
3. After QL-style Files nav + reinstall: `files-on-my-iphone` → `files-host-folder` → `files-fixture-opened` succeed.
4. Host App Group payload stays **`none`** through extended poll — `CSImportExtension.update` is **not** running (or not sharing) on Simulator after Files open.
5. `simctl spawn mdimport` → NSPOSIXErrorDomain code 2 (unavailable in sim runtime).
6. Spotlight UI can show a typed-query-adjacent label (`spotlight-result-visible`) but journey correctly treats that as **untrusted** without App Group.
7. Sim `codesign --entitlements` dumps empty dicts for host/appex (also true for greened QL) — not diagnostic for App Groups on Simulator.

## Follow-ups

- Keep CLAIMS; revisit message-filter on device / cellular-capable Sim if Apple exposes Unknown Senders again.
- Spotlight: research whether CSImportExtension is Sim-invoked at all for sandbox Documents; optional host-side `CSSearchableIndex` would not falsify import extension.
- Consumer `@csark0812/devicewright@0.1.14` locked.
