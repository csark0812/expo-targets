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
    touchpoint: "Share sheet → Save → host payload marker",
    status: "concrete",
  },
  {
    id: "action",
    tranche: "V1",
    touchpoint: "Share sheet → Process → host payload marker",
    status: "concrete",
  },
  {
    id: "native-share",
    tranche: "V1",
    touchpoint: "Share sheet → Save to App → host payload marker",
    status: "concrete",
  },
  {
    id: "native-action",
    tranche: "V1",
    touchpoint: "Share sheet → Process Image → host payload marker",
    status: "concrete",
  },
  {
    id: "messages",
    tranche: "V1",
    touchpoint: "Messages extension open + host sync marker",
    status: "concrete",
  },
  {
    id: "stickers",
    tranche: "V1",
    touchpoint: "Sticker pack catalog visible on host",
    status: "concrete",
  },
  {
    id: "clip",
    tranche: "V1",
    touchpoint: "App Clip host contract + clip launch path",
    status: "concrete",
  },
  {
    id: "widgets",
    tranche: "V1/T13",
    touchpoint: "WidgetKit spine host + widget tile present",
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
      "category push delivered + content-extension appex in pluginkit (rich UI expand best-effort on Simulator)",
    status: "concrete",
  },
  {
    id: "native-notification-content",
    type: "notification-content",
    tranche: "T1",
    touchpoint:
      "category push delivered + content-extension appex in pluginkit (native; rich UI best-effort)",
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
      "Native clip host contract + clip launch path (REQUIRED promote)",
    status: "concrete",
  },

  // T3 Safari + content-blocker
  {
    id: "safari",
    type: "safari",
    tranche: "T3",
    touchpoint:
      "Settings Apps → Safari → Extensions lists ET Safari Target → Allow Extension → Safari example.com",
    status: "concrete",
  },
  {
    id: "native-safari",
    type: "safari",
    tranche: "T3",
    touchpoint:
      "Settings Apps → Safari → Extensions lists native appex → Allow Extension → Safari surface",
    status: "concrete",
  },
  {
    id: "content-blocker",
    type: "content-blocker",
    tranche: "T3",
    touchpoint:
      "Settings Safari Content Blockers enable + Safari ads.example.com block attempt",
    status: "concrete",
  },

  // T4–T13
  {
    id: "app-intent",
    tranche: "T4",
    touchpoint:
      "pluginkit lists appintents-extension appex (+ Shortcuts best-effort)",
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
    touchpoint: "AutoFill / Settings provider listed; deeper flow os-limit",
    status: "stub",
  },
  {
    id: "account-auth",
    tranche: "T5",
    touchpoint: "Account auth modification UI extension load",
    status: "stub",
  },
  {
    id: "authentication-services",
    tranche: "T5",
    touchpoint: "SSO extension install + host contract",
    status: "stub",
  },
  {
    id: "photo-editing",
    tranche: "T6",
    touchpoint:
      "Photos Edit lists ET PhotoEdit, or pluginkit lists photo-editing appex (real PHContentEditingController)",
    status: "concrete",
  },
  {
    id: "file-provider",
    tranche: "T6",
    touchpoint:
      "pluginkit lists fileprovider-nonui appex (Files Browse domain best-effort)",
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
      "Settings Keyboard lists ET Keyboard Target + enable attempt (ET key principal)",
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
    touchpoint: "DeviceActivity monitor install + plist; flow os-limit",
    status: "stub",
  },
  {
    id: "shield-action",
    tranche: "T9",
    touchpoint: "Shield action extension install; Family Controls os-limit",
    status: "stub",
  },
  {
    id: "shield-config",
    tranche: "T9",
    touchpoint: "Shield config extension install; Family Controls os-limit",
    status: "stub",
  },
  {
    id: "network-packet-tunnel",
    tranche: "T10",
    touchpoint: "NE packet tunnel appex present; tunnel os-limit",
    status: "stub",
  },
  {
    id: "network-app-proxy",
    tranche: "T10",
    touchpoint: "NE app proxy appex present; tunnel os-limit",
    status: "stub",
  },
  {
    id: "network-dns-proxy",
    tranche: "T10",
    touchpoint: "NE DNS proxy appex present; tunnel os-limit",
    status: "stub",
  },
  {
    id: "network-filter-data",
    tranche: "T10",
    touchpoint: "NE filter-data appex present; tunnel os-limit",
    status: "stub",
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
    touchpoint: "Paired watchOS sim/device host+watch install",
    status: "stub",
  },
  {
    id: "watch-widget",
    tranche: "T12",
    touchpoint: "Paired watchOS simulator / device",
    status: "stub",
  },
] as const;

export function touchpointForId(id: string): TouchpointDef | undefined {
  return TOUCHPOINTS.find((t) => t.id === id);
}
