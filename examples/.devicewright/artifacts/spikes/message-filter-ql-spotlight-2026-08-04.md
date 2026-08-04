# Spike: message-filter / quicklook-preview / spotlight (2026-08-04)

**Device:** iPhone Air `0E7FA53F-23B3-4F10-BAE1-AED7515401B2` · iOS 26.5  
**DW:** `@csark0812/devicewright@0.1.14` (consumer lockfile + fail-fast matrix lock)  
**Artifacts:**
- earlier: `examples/.devicewright/artifacts/targets-1785863719848` (QL green / MF os-limit)
- re-proof: `examples/.devicewright/artifacts/targets-1785865324923` (QL green / MF os-limit / spotlight os-limit)

## Verdicts

| id | Prior claim | After falsify | Evidence |
| -- | ----------- | ------------- | -------- |
| **quicklook-preview** | weak os-limit | **GREEN (P)** | Files → `et-preview.etql` → **ET QL Preview** + Open In **ET QLPreview** + App Group `qlPreview:*` |
| **message-filter** | weak os-limit | **os-limit (kept)** | pluginkit OK; Apps→Messages path; iOS 26 filter surfaces absent / Messages pane blank |
| **spotlight** | strong ceiling | **os-limit (CLAIMS)** | pluginkit + fixture; Spotlight UI typed and a result label appeared but marked **untrusted** (no App Group importer proof) |

## quicklook-preview — greened

Matrix steps (0.1.14 re-proof): `pluginkit-quicklook-preview` → `files-fixture-opened` → `ql-preview-ui` → `ql-preview-appgroup` → **green**.

Note: host-side `mdls` on the sim container path reports `dyn.*` UTI — **misleading**; Simulator Files + QL bind correctly.

## message-filter — claim retained

Matrix: `sms-filtering-settings-unavailable` → **os-limit** (CLAIMS). Filter surface searches all miss.

## spotlight — claim retained

Matrix: `spotlight-result-visible` + `spotlight-search-untrusted` → **os-limit** (CLAIMS). Need App Group `spotlight:*` importer for GREEN.

## Follow-ups

- Consumer bump to devicewright `0.1.14` done (package.json + bun.lock).
- Commit journey/example WIP + claims/touchpoints on `chris/feat/deep-green-fp-ai-clip-cd` when ready.
- Optional: harden spotlight journey to require App Group before trusting Spotlight AX labels.
