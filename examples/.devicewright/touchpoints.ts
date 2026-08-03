/**
 * Live-touchpoint catalog for REQUIRED matrix rows.
 * Touchpoints must exercise load/invoke, not mere PlugIns file presence.
 */

export type TouchpointDef = {
  id: string;
  /** Extension / Bacon type string when different from id. */
  type?: string;
  tranche: string;
  /** What "alive" means for the min green floor. */
  touchpoint: string;
  /** Concrete for T1–T3; stub for later until that tranche PR. */
  status: "concrete" | "stub";
};

export const TOUCHPOINTS: readonly TouchpointDef[] = [
  // REQUIRED_V1 / V2 seed
  {
    id: "share",
    tranche: "V1",
    touchpoint:
      "Share sheet text Save → host marker; image share → kind:image marker",
    status: "concrete",
  },
  {
    id: "action",
    tranche: "V1",
    touchpoint:
      "Share sheet image Process → grayscale + kind:image host marker",
    status: "concrete",
  },
  {
    id: "native-share",
    tranche: "V1",
    touchpoint:
      "Share sheet text Save to App → host marker; image → type:image",
    status: "concrete",
  },
  {
    id: "native-action",
    tranche: "V1",
    touchpoint:
      "Share sheet Process Image → Original + kind:image + returnedItems",
    status: "concrete",
  },
  {
    id: "messages",
    tranche: "V1",
    touchpoint:
      "Messages drawer → Expand/Compact + session + attachment + Send template → host payload",
    status: "concrete",
  },
  {
    id: "stickers",
    tranche: "V1",
    touchpoint:
      "Sticker pack catalog + Stickers browser; insert AX-opaque (asset-only policy)",
    status: "concrete",
  },
  {
    id: "clip",
    tranche: "V1",
    touchpoint:
      "App Clip host contract + launchApp(clip bundle) invocation marker",
    status: "concrete",
  },
  {
    id: "widgets",
    tranche: "V1/T13",
    touchpoint:
      "WidgetKit spine + family:systemSmall seed + systemMedium family note",
    status: "concrete",
  },
  {
    id: "live-activity",
    tranche: "V1/T13",
    touchpoint:
      "Trick host ActivityKit start + update + end; Lock preferred; Watch when pair boots; DI/push/StandBy CLAIMS",
    status: "concrete",
  },

  // T1 Notifications
  {
    id: "notification-service",
    type: "notification-service",
    tranche: "T1",
    touchpoint:
      "pluginkit lists usernotifications.service appex (real UNNotificationServiceExtension; Simulator often skips mutation process)",
    status: "concrete",
  },
  {
    id: "notification-content",
    type: "notification-content",
    tranche: "T1",
    touchpoint:
      "category push + expand → ET NCE Content custom UI marker (required green)",
    status: "concrete",
  },
  {
    id: "native-notification-content",
    type: "notification-content",
    tranche: "T1",
    touchpoint:
      "category push + expand → ET NCE Content custom UI marker (required green)",
    status: "concrete",
  },

  // T2 Wallet + native-clip
  {
    id: "wallet",
    type: "wallet",
    tranche: "T2",
    touchpoint:
      "Host PassKit / issuer extension presence + host contract; issuer flow may os-limit",
    status: "concrete",
  },
  {
    id: "wallet-ui",
    type: "wallet-ui",
    tranche: "T2",
    touchpoint:
      "pluginkit lists PassKit issuer-provisioning.authorization appex",
    status: "concrete",
  },
  {
    id: "native-clip",
    type: "clip",
    tranche: "T2",
    touchpoint:
      "Native clip host + launchApp(clip bundle) invocation (REQUIRED promote)",
    status: "concrete",
  },

  // T3 Safari + content-blocker
  {
    id: "safari",
    type: "safari",
    tranche: "T3",
    touchpoint:
      "Host popup/content-script/native-msg markers + Settings Safari Extensions → Allow → Safari",
    status: "concrete",
  },
  {
    id: "native-safari",
    type: "safari",
    tranche: "T3",
    touchpoint:
      "Host popup/content-script/native-msg markers + Settings Safari Extensions → Allow",
    status: "concrete",
  },
  {
    id: "content-blocker",
    type: "content-blocker",
    tranche: "T3",
    touchpoint:
      "Host rules:N + reload control + Settings Content Blockers enable + Safari block attempt",
    status: "concrete",
  },

  // T4–T13
  {
    id: "app-intent",
    tranche: "T4",
    touchpoint:
      "pluginkit appintents-extension + Shortcuts lists Say Hello / ET AppIntent",
    status: "concrete",
  },
  {
    id: "intent",
    tranche: "T4",
    touchpoint:
      "Settings Apps host registration (IntentsSupported is build-time; Siri invoke not attempted)",
    status: "concrete",
  },
  {
    id: "intent-ui",
    tranche: "T4",
    touchpoint:
      "pluginkit lists intents-ui-service appex (IntentViewController principal)",
    status: "concrete",
  },
  {
    id: "credentials-provider",
    tranche: "T5",
    touchpoint:
      "pluginkit lists credential-provider appex; AutoFill UI os-limit",
    status: "concrete",
  },
  {
    id: "account-auth",
    tranche: "T5",
    touchpoint:
      "pluginkit lists account-auth modification appex; Settings os-limit",
    status: "concrete",
  },
  {
    id: "authentication-services",
    tranche: "T5",
    touchpoint: "pluginkit lists AppSSO idp appex; SSO flow os-limit",
    status: "concrete",
  },
  {
    id: "photo-editing",
    tranche: "T6",
    touchpoint:
      "Done-persistence host surface + Photos Edit / pluginkit photo-editing appex",
    status: "concrete",
  },
  {
    id: "file-provider",
    tranche: "T6",
    touchpoint:
      "Host registers NSFileProviderDomain + Files Browse lists ET FileProv (pluginkit alone insufficient)",
    status: "concrete",
  },
  {
    id: "file-provider-ui",
    tranche: "T6",
    touchpoint: "pluginkit lists fileprovider-actionsui appex",
    status: "concrete",
  },
  {
    id: "quicklook-thumbnail",
    tranche: "T6",
    touchpoint: "Settings Apps host registration",
    status: "concrete",
  },
  {
    id: "quicklook-preview",
    tranche: "T6",
    touchpoint: "Settings Apps host registration",
    status: "concrete",
  },
  {
    id: "call-directory",
    tranche: "T7",
    touchpoint:
      "Settings Phone → Call Blocking & Identification lists ET CallDir Target",
    status: "concrete",
  },
  {
    id: "message-filter",
    tranche: "T7",
    touchpoint: "Settings Apps host registration",
    status: "concrete",
  },
  {
    id: "unwanted-communication",
    tranche: "T7",
    touchpoint: "Settings Apps host registration",
    status: "concrete",
  },
  {
    id: "keyboard",
    tranche: "T7",
    touchpoint:
      "Settings Keyboard lists ET Keyboard + host type-into-field (typed:ET)",
    status: "concrete",
  },
  {
    id: "broadcast-upload",
    tranche: "T8",
    touchpoint: "pluginkit lists broadcast-services-upload appex",
    status: "concrete",
  },
  {
    id: "broadcast-setup-ui",
    tranche: "T8",
    touchpoint: "pluginkit lists broadcast-services-setupui appex",
    status: "concrete",
  },
  {
    id: "device-activity-monitor",
    tranche: "T9",
    touchpoint:
      "pluginkit lists DeviceActivity monitor appex; Family Controls os-limit",
    status: "concrete",
  },
  {
    id: "shield-action",
    tranche: "T9",
    touchpoint: "pluginkit lists shield-action appex; Family Controls os-limit",
    status: "concrete",
  },
  {
    id: "shield-config",
    tranche: "T9",
    touchpoint: "pluginkit lists shield-config appex; Family Controls os-limit",
    status: "concrete",
  },
  {
    id: "network-packet-tunnel",
    tranche: "T10",
    touchpoint: "pluginkit lists NE packet-tunnel appex; tunnel os-limit",
    status: "concrete",
  },
  {
    id: "network-app-proxy",
    tranche: "T10",
    touchpoint: "pluginkit lists NE app-proxy appex; tunnel os-limit",
    status: "concrete",
  },
  {
    id: "network-dns-proxy",
    tranche: "T10",
    touchpoint: "pluginkit lists NE dns-proxy appex; tunnel os-limit",
    status: "concrete",
  },
  {
    id: "network-filter-data",
    tranche: "T10",
    touchpoint: "pluginkit lists NE filter-data appex; tunnel os-limit",
    status: "concrete",
  },
  {
    id: "spotlight",
    tranche: "T11",
    touchpoint: "Settings Apps host registration",
    status: "concrete",
  },
  {
    id: "spotlight-delegate",
    tranche: "T11",
    touchpoint: "Settings Apps host registration",
    status: "concrete",
  },
  {
    id: "bg-download",
    tranche: "T11",
    touchpoint: "Settings Apps host registration",
    status: "concrete",
  },
  {
    id: "location-push",
    tranche: "T11",
    touchpoint:
      "pluginkit lists location.push.service appex (push delivery os-limit)",
    status: "concrete",
  },
  {
    id: "matter",
    tranche: "T11",
    touchpoint: "Settings Apps host registration",
    status: "concrete",
  },
  {
    id: "classkit-context",
    tranche: "T11",
    touchpoint: "Settings Apps host registration",
    status: "concrete",
  },
  {
    id: "print-service",
    tranche: "T11",
    touchpoint: "Settings Apps host registration",
    status: "concrete",
  },
  {
    id: "smart-card",
    tranche: "T11",
    touchpoint: "Settings Apps host registration",
    status: "concrete",
  },
  {
    id: "virtual-conference",
    tranche: "T11",
    touchpoint: "Settings Apps host registration",
    status: "concrete",
  },
  {
    id: "watch",
    tranche: "T12",
    touchpoint: "Host install + paired watchOS sim/device os-limit",
    status: "concrete",
  },
  {
    id: "watch-widget",
    tranche: "T12",
    touchpoint: "pluginkit lists watch widget appex; paired watch os-limit",
    status: "concrete",
  },
] as const;

export function touchpointForId(id: string): TouchpointDef | undefined {
  return TOUCHPOINTS.find((t) => t.id === id);
}
