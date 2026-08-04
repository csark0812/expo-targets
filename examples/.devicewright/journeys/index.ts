import type { DeviceSession } from "@csark0812/devicewright";
import type { RequiredTargetRow } from "../required";
import type { TargetJourneyResult } from "../types";
import { runAppIntentJourney } from "./app-intent";
import { runAppsSettingsJourney } from "./apps-settings";
import { runBroadcastSetupUiJourney } from "./broadcast-setup-ui";
import { runBroadcastUploadJourney } from "./broadcast-upload";
import { runCallDirectoryJourney } from "./call-directory";
import { runClipJourney } from "./clip";
import { runContentBlockerJourney } from "./content-blocker";
import { runFileProviderJourney } from "./file-provider";
import { runFileProviderUiJourney } from "./file-provider-ui";
import { runHostContractJourney } from "./host-contract";
import { runIntentJourney } from "./intent";
import { runIntentUiJourney } from "./intent-ui";
import { runKeyboardJourney } from "./keyboard";
import { runLiveActivityJourney } from "./live-activity";
import { runLocationPushJourney } from "./location-push";
import { runMessageFilterJourney } from "./message-filter";
import { runMessagesJourney } from "./messages";
import { runNotificationContentJourney } from "./notification-content";
import { runNotificationServiceJourney } from "./notification-service";
import { runPhotoEditingJourney } from "./photo-editing";
import { runQuicklookPreviewJourney } from "./quicklook-preview";
import { runQuicklookThumbnailJourney } from "./quicklook-thumbnail";
import { runSafariJourney } from "./safari";
import { runUnwantedCommunicationJourney } from "./unwanted-communication";
import { runShareActionJourney } from "./share";
import { runSpotlightJourney } from "./spotlight";
import { runStickersJourney } from "./stickers";
import { stubClusterJourneyFor } from "./stub-cluster";
import { runWalletUiJourney } from "./wallet-ui";
import { runWatchJourney, runWatchWidgetJourney } from "./watch";
import { runWidgetsJourney } from "./widgets";

export { runAppIntentJourney } from "./app-intent";
export { runAppsSettingsJourney } from "./apps-settings";
export { runBroadcastSetupUiJourney } from "./broadcast-setup-ui";
export { runBroadcastUploadJourney } from "./broadcast-upload";
export { runCallDirectoryJourney } from "./call-directory";
export { runClipJourney } from "./clip";
export { runContentBlockerJourney } from "./content-blocker";
export {
  assertPayloadContains,
  C1,
  tapId,
  waitForId,
  waitForNamed,
} from "./helpers";
export { runFileProviderJourney } from "./file-provider";
export { runFileProviderUiJourney } from "./file-provider-ui";
export { runHostContractJourney } from "./host-contract";
export { runIntentJourney } from "./intent";
export { runIntentUiJourney } from "./intent-ui";
export { runKeyboardJourney } from "./keyboard";
export { runLiveActivityJourney } from "./live-activity";
export { runLocationPushJourney } from "./location-push";
export { runMessageFilterJourney } from "./message-filter";
export { runMessagesJourney } from "./messages";
export { runNotificationContentJourney } from "./notification-content";
export { runNotificationServiceJourney } from "./notification-service";
export { runPhotoEditingJourney } from "./photo-editing";
export { runQuicklookPreviewJourney } from "./quicklook-preview";
export { runQuicklookThumbnailJourney } from "./quicklook-thumbnail";
export { runSafariJourney } from "./safari";
export { runUnwantedCommunicationJourney } from "./unwanted-communication";
export { runShareActionJourney } from "./share";
export { runSpotlightJourney } from "./spotlight";
export {
  navigatePath,
  allowAppexOnWebsite,
  openAppexAndAllowExtension,
  openSafariExtensionPopup,
  openSafariExtensionsOrBlockers,
  openSettingsApps,
  openSystemSafariSettings,
  revealSettingsApps,
  scrollUntilVisible,
  searchAppsAndOpen,
  tapLabelInTree,
} from "./settings-nav";
export { runStickersJourney } from "./stickers";
export { runWalletUiJourney } from "./wallet-ui";
export { runWatchJourney, runWatchWidgetJourney } from "./watch";
export { runWidgetsJourney } from "./widgets";

export type JourneyRunner = (
  device: DeviceSession,
) => Promise<TargetJourneyResult>;

/** ids proven via generic Settings→Apps→search host→host settings page. */
const APPS_SETTINGS_IDS = [
  "spotlight-delegate",
  "bg-download",
  "matter",
  "classkit-context",
  "print-service",
  "smart-card",
  "virtual-conference",
] as const;

const LIVE: Record<string, JourneyRunner> = {
  share: (d) => runShareActionJourney(d, "share"),
  action: (d) => runShareActionJourney(d, "action"),
  "native-share": (d) => runShareActionJourney(d, "native-share"),
  "native-action": (d) => runShareActionJourney(d, "native-action"),
  messages: (d) => runMessagesJourney(d, "A"),
  stickers: (d) => runStickersJourney(d, "A"),
  clip: (d) => runClipJourney(d, "clip"),
  "native-clip": (d) => runClipJourney(d, "native-clip"),
  widgets: (d) => runWidgetsJourney(d),
  "live-activity": (d) => runLiveActivityJourney(d),
  safari: (d) => runSafariJourney(d, "safari"),
  "native-safari": (d) => runSafariJourney(d, "native-safari"),
  "content-blocker": (d) => runContentBlockerJourney(d),
  keyboard: (d) => runKeyboardJourney(d),
  intent: (d) => runIntentJourney(d),
  "intent-ui": (d) => runIntentUiJourney(d),
  "wallet-ui": (d) => runWalletUiJourney(d),
  "notification-service": (d) => runNotificationServiceJourney(d),
  "notification-content": (d) =>
    runNotificationContentJourney(d, "notification-content"),
  "native-notification-content": (d) =>
    runNotificationContentJourney(d, "native-notification-content"),
  "photo-editing": (d) => runPhotoEditingJourney(d),
  "file-provider": (d) => runFileProviderJourney(d),
  "file-provider-ui": (d) => runFileProviderUiJourney(d),
  "app-intent": (d) => runAppIntentJourney(d),
  "broadcast-upload": (d) => runBroadcastUploadJourney(d),
  "broadcast-setup-ui": (d) => runBroadcastSetupUiJourney(d),
  "call-directory": (d) => runCallDirectoryJourney(d),
  "message-filter": (d) => runMessageFilterJourney(d),
  "unwanted-communication": (d) => runUnwantedCommunicationJourney(d),
  "quicklook-preview": (d) => runQuicklookPreviewJourney(d),
  "quicklook-thumbnail": (d) => runQuicklookThumbnailJourney(d),
  spotlight: (d) => runSpotlightJourney(d),
  "location-push": (d) => runLocationPushJourney(d),
  watch: (d) => runWatchJourney(d, "watch"),
  "watch-widget": (d) => runWatchWidgetJourney(d),
};

const STUB_CLUSTER_IDS = [
  "credentials-provider",
  "account-auth",
  "authentication-services",
  "device-activity-monitor",
  "shield-action",
  "shield-config",
  "network-packet-tunnel",
  "network-app-proxy",
  "network-dns-proxy",
  "network-filter-data",
] as const;

for (const id of STUB_CLUSTER_IDS) {
  const runner = stubClusterJourneyFor(id);
  if (runner) LIVE[id] = runner;
}

for (const id of APPS_SETTINGS_IDS) {
  LIVE[id] = (d) => runAppsSettingsJourney(d, id);
}

/** Fallback: host-contract journey for any REQUIRED id not in LIVE. */
export function journeyFor(id: string): JourneyRunner | undefined {
  if (LIVE[id]) return LIVE[id];
  // Prefer host-contract for newly scaffolded Bacon-compat rows
  return (d) => runHostContractJourney(d, id);
}

export function stubResult(row: RequiredTargetRow): TargetJourneyResult {
  return {
    id: row.id,
    path: row.path,
    phase: row.phase,
    ok: false,
    status: "stub",
    steps: ["stub"],
    failureKind: "stub",
    error: `phase ${row.phase} stub — journey not executed in this matrix mode`,
  };
}
