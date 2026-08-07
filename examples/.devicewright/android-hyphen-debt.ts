import { TARGET_CATALOG } from "./catalog";
import { REQUIRED_ANDROID_IDS } from "./required";

/**
 * Dual matrix ids whose android.package still has hyphens, or catalog lacks
 * `androidPackage` when `hostBundleId` has hyphens.
 *
 * Scan (catalog): for each REQUIRED_ANDROID id, if hostBundleId includes "-"
 * and androidPackage is missing, OR androidPackage includes "-", the id is
 * in debt. Already-fixed duals (file-provider, credentials-provider,
 * call-directory, print-service, network-packet-tunnel, file-provider-ui,
 * notification-*, Phase 3–4 W4/Wear ids) set hyphen-free androidPackage
 * and are omitted.
 *
 * Remaining debt: none in REQUIRED_ANDROID after Phase 3–4 (empty list).
 * Owning phase PRs clear their ids before merge.
 */
export const ANDROID_HYPHEN_DEBT_IDS: readonly string[] = Object.freeze([]);

/** Derive debt from TARGET_CATALOG for a REQUIRED_ANDROID id. */
export function catalogHasAndroidHyphenDebt(id: string): boolean {
  const entry = TARGET_CATALOG[id];
  if (!entry) return false;
  const hostHasHyphen = entry.hostBundleId.includes("-");
  if (hostHasHyphen && !entry.androidPackage) return true;
  if (entry.androidPackage?.includes("-")) return true;
  return false;
}

/** All REQUIRED_ANDROID ids that currently match the catalog scan. */
export function scanAndroidHyphenDebtFromCatalog(): string[] {
  return REQUIRED_ANDROID_IDS.filter((id) => catalogHasAndroidHyphenDebt(id));
}
