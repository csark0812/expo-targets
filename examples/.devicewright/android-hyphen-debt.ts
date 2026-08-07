import { TARGET_CATALOG } from "./catalog";
import { REQUIRED_ANDROID_IDS } from "./required";

/**
 * Dual matrix ids whose android.package still has hyphens, or catalog lacks
 * `androidPackage` when `hostBundleId` has hyphens.
 *
 * Scan (catalog): for each REQUIRED_ANDROID id, if hostBundleId includes "-"
 * and androidPackage is missing, OR androidPackage includes "-", the id is
 * in debt. Already-fixed duals (file-provider, credentials-provider,
 * call-directory, print-service, network-packet-tunnel, file-provider-ui)
 * set hyphen-free androidPackage and are omitted.
 *
 * Known app.json android.package still hyphenated (examples duals):
 * - notification-service, notification-content, native-notification-content
 * - app-intent, photo-editing, watch-widget
 * - spotlight-delegate, bg-download, message-filter, unwanted-communication
 *
 * Owning phase PRs clear their ids before merge (Phase 1a–4 wiring).
 */
export const ANDROID_HYPHEN_DEBT_IDS: readonly string[] = Object.freeze([
  "notification-service",
  "notification-content",
  "native-notification-content",
  "app-intent",
  "photo-editing",
  "watch-widget",
  "spotlight-delegate",
  "bg-download",
  "message-filter",
  "unwanted-communication",
]);

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
