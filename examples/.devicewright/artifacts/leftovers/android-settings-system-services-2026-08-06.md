# S3a — Android Settings / system-service surfaces (2026-08-06)

**Spike gate for** Android dual os-limit CLAIMS reasons that depend on Settings or system consent UIs. Docs ≠ journey os-limit; journeys land in later phases after honest Locked P attempt.

<!-- doc-meta: owner=eng | last-reviewed=2026-08-06 -->

Env baseline: AOSP / Google APIs emulator, API ≥ 34 (Pixel family). Wallet/Play-dependent surfaces need Google APIs + Play Store image.

## Surface map

| Matrix id | Settings / system screen | Locked P label proof | Known OEM / API dead-ends |
| --- | --- | --- | --- |
| `credentials-provider` | **Settings → Passwords & accounts / Autofill service** (API 26+: `Settings.ACTION_REQUEST_SET_AUTOFILL_SERVICE` or Languages & input → Autofill) | Autofill settings list shows this `AutofillService` label (ET Credentials / package) | Some OEM skins hide the Autofill picker or require a separate “Passwords” app; list may omit freshly installed services until Settings restart |
| `call-directory` | **Settings → Apps → Special app access → Caller ID & spam** / Call Screening (OEM: Phone app → Caller ID) | Call Screening settings UI lists this `CallScreeningService` by label | Non-telephony AVDs / AOSP without dialer extras may omit the screen; Samsung/Pixel paths diverge; dumpsys service alone ≠ Locked P |
| `print-service` | **Settings → Connected devices → Connection preferences → Printing** (or search “Printing”) | Print services Settings lists this `PrintService` by label | Some images ship without Printing preference; OEM may nest under “More connection settings” |
| `network-packet-tunnel` | **System VPN consent / `VpnService.prepare` UI** (not a durable Settings list row) | System VPN consent/prepare dialog for this `VpnService` shown after honest prepare | Dialog may be non-AX / one-shot; OEM VPN managers intercept; Settings → Network → VPN list alone is soft-exit |
| `keyboard` (re-audit) | **Settings → System → Languages & input → On-screen keyboard → Manage keyboards** | IME settings lists ET Keyboard | Work profile / OEM “Gboard only” policies; enabling Full Access / “Allow display over other apps” may be separate gates |
| `message-filter` | **Settings → Apps → Special app access** / Default SMS app extras / OEM **Messages → Spam protection** filter-provider list | Filter settings UI lists this service | AOSP often has no first-party SMS filter list; carrier/OEM Messages required; Settings search “SMS” may dead-end |
| `unwanted-communication` | **Settings → Safety / Apps → Call screening & spam** extras, or OEM reporting-app picker | Reporting/screening extras UI lists this service | Many AOSP images lack a reporting-app list; Play Services / Phone app extras only on Google images |

## Honest attempt vs soft-exit

- **Honest attempt:** open the Settings/system screen above (named in journey `steps`), wait for list/dialog, assert label — then green or Android `os-limit` CLAIMS.
- **Soft-exit (forbidden green):** `pm path` / package install only; `dumpsys` service registration; host CTA that opens Settings without the list label.

## Cross-links

- Draft Android CLAIMS: [`../claims.ts`](../claims.ts) (`platforms: ["android"]`)
- Hard-stop cell: [`docs/limits.md`](../../../../docs/limits.md)
- Soft-exit matrix rules: [`../PR_PROOF.md`](../PR_PROOF.md)
