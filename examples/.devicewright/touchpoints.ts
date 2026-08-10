/**
 * Live-touchpoint catalog for REQUIRED matrix rows.
 * Touchpoints must exercise load/invoke, not mere PlugIns file presence.
 *
 * notification-service Phase 1 full-demo bar: green = lock-screen AX + App
 * Group (both), matching this run’s title nonce + `[expo-targets]`. Host /
 * pluginkit / App Group alone never exits green. Phase 2: keyboard / LA /
 * stickers / watch also require visible OS demos (CLAIMS when Sim ceiling).
 */

export type TouchpointDef = {
  id: string;
  /** Extension type string when different from id. */
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
      "Messages drawer → Expand/Compact + session + attachment + Send template → host payload (session+attachment required)",
    status: "concrete",
  },
  {
    id: "stickers",
    tranche: "V1",
    touchpoint:
      "Pack catalog + Stickers browser + Fun Stickers + Sticker:*.png draft (attached to outgoing message) + Send",
    status: "concrete",
  },
  {
    id: "clip",
    tranche: "V1",
    touchpoint:
      "App Clip Frameworks+jsbundle + launchApp(_XCAppClipURL) + checkout App Group",
    status: "concrete",
  },
  {
    id: "widgets",
    tranche: "V1/T13",
    touchpoint:
      "Seed Hello from host + family:systemSmall (seed-derived) + SpringBoard Small widget tile",
    status: "concrete",
  },
  {
    id: "widgets-expo-ui",
    tranche: "expo-ui",
    touchpoint:
      "Seed Hello from host · expo-ui + SpringBoard/launcher Hello Expo UI tile",
    status: "concrete",
  },
  {
    id: "widgets-remoteviews",
    tranche: "android-remoteviews",
    touchpoint:
      "Seed Hello from host · remoteviews + launcher Hello RemoteViews tile",
    status: "concrete",
  },
  {
    id: "live-activity",
    tranche: "V1/T13",
    touchpoint:
      "Trick host start+update+end + Lock chrome (ET Trick Live / Always Allow); Watch Smart Stack (CarouselLiveActivitiesAlertUI / ET Trick Live) when pair connected; else CLAIMS",
    status: "concrete",
  },

  // T1 Notifications
  {
    id: "notification-service",
    type: "notification-service",
    tranche: "T1",
    touchpoint:
      "DW pushRemoteNotification (nonce title) → lock-screen AX + App Group both show nonce+[expo-targets] (simctl never launches NSE; needs APNS_* AuthKey)",
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
      "Native Swift AppClips/*.app + launchApp(_XCAppClipURL) + Complete checkout → invocationPath",
    status: "concrete",
  },

  // T3 Safari + content-blocker
  {
    id: "safari",
    type: "safari",
    tranche: "T3",
    touchpoint:
      "Allow On + example.com + Safari Page Menu opens ET Safari Target popup + native App Group",
    status: "concrete",
  },
  {
    id: "native-safari",
    type: "safari",
    tranche: "T3",
    touchpoint:
      "Allow On + example.com + Safari Page Menu opens extension popup + native App Group",
    status: "concrete",
  },
  {
    id: "content-blocker",
    type: "content-blocker",
    tranche: "T3",
    touchpoint:
      "Host rules:4 + reload + Allow Extension On + Safari local fixture css-display-none (.et-blocked-ad)",
    status: "concrete",
  },

  // T4–T13
  {
    id: "app-intent",
    tranche: "T4",
    touchpoint:
      "pluginkit appintents-extension + host AppShortcuts list ET Greet (Unable to run → App Group leftover on Air)",
    status: "concrete",
  },
  {
    id: "intent",
    tranche: "T4",
    touchpoint:
      "Settings Apps host registration; Siri invoke os-limit (CLAIMS)",
    status: "concrete",
  },
  {
    id: "intent-ui",
    tranche: "T4",
    touchpoint:
      "pluginkit intents-ui-service + os-limit (Siri presentation CLAIMS)",
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
      "Photos Edit → More → Extensions → ET PhotoEdit → Done → App Group photo-edit done",
    status: "concrete",
  },
  {
    id: "file-provider",
    tranche: "T6",
    touchpoint:
      "iOS: Files Browse ET FileProv + App Group fp:*; Android: DocumentsUI lists Expo Targets root + host android-docs marker",
    status: "concrete",
  },
  {
    id: "file-provider-ui",
    tranche: "T6",
    touchpoint:
      "pluginkit fileprovider-actionsui + os-limit (CLAIMS)",
    status: "concrete",
  },
  {
    id: "quicklook-thumbnail",
    tranche: "T6",
    touchpoint:
      "pluginkit quicklook.thumbnail + Files browses et-thumb.etqlt → App Group ET QL Thumb",
    status: "concrete",
  },
  {
    id: "quicklook-preview",
    tranche: "T6",
    touchpoint:
      "pluginkit quicklook.preview + Files opens et-preview.etql → ET QL Preview (Open In / App Group)",
    status: "concrete",
  },
  {
    id: "call-directory",
    tranche: "T7",
    touchpoint:
      "pluginkit callkit.call-directory + Settings Phone → Call Blocking & Identification lists ET CallDir Target (CLAIMS — Phone/Call Blocking opaque on Air)",
    status: "concrete",
  },
  {
    id: "message-filter",
    tranche: "T7",
    touchpoint:
      "pluginkit identitylookup.message-filter + Messages Unknown Senders / Text Message Filter lists ET MsgFilter Target (CLAIMS — Settings/filter surfaces opaque on Sim)",
    status: "concrete",
  },
  {
    id: "unwanted-communication",
    tranche: "T7",
    touchpoint:
      "pluginkit classification-ui + Settings Phone → SMS/Call Reporting lists ET Unwanted Target (CLAIMS — reporting picker opaque on non-telephony Sim)",
    status: "concrete",
  },
  {
    id: "keyboard",
    tranche: "T7",
    touchpoint:
      "Settings General→Keyboard + Full Access + software keyboard + Next keyboard → ET key → typed:ET (not device.type)",
    status: "concrete",
  },
  {
    id: "broadcast-upload",
    tranche: "T8",
    touchpoint:
      "pluginkit broadcast-services-upload + os-limit (CLAIMS)",
    status: "concrete",
  },
  {
    id: "broadcast-setup-ui",
    tranche: "T8",
    touchpoint:
      "pluginkit broadcast-services-setupui + os-limit (CLAIMS)",
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
    touchpoint:
      "pluginkit spotlight.import + et-import.etspot → App Group importer marker and/or Spotlight search (CLAIMS if indexer opaque)",
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
    touchpoint:
      "Pair connected + watchOS companion on watch UDID + ET Watch Target AX; else CLAIMS after honest attempt",
    status: "concrete",
  },
  {
    id: "watch-widget",
    tranche: "T12",
    touchpoint:
      "Pair connected + watch companion with nested PlugIns ET Watch Widget; else CLAIMS after honest attempt",
    status: "concrete",
  },
] as const;

/**
 * Android Master Locked P (verbatim) for REQUIRED_ANDROID ids.
 * Journey assertions and Phase 6 matrix gate copy these strings — do not diverge.
 */
export const ANDROID_LOCKED_P: Readonly<Record<string, string>> = {
  share: "Host share sheet → chooser → Save → host marker",
  action: "Host share sheet → chooser → Process/auto → host marker",
  widgets: "Launcher tile shows seeded marker",
  "widgets-expo-ui":
    "Launcher tile shows expo-ui seeded marker (Hello Expo UI)",
  "widgets-remoteviews":
    "Launcher tile shows remoteviews seeded marker (Hello RemoteViews)",
  "file-provider":
    "DocumentsUI Show roots → root titled Expo Targets listed",
  keyboard:
    "DW IME enable+select (setInputMethod) + soft keyboard + ET key → typed:ET (not device.type)",
  "native-share": "Host sheet → chooser → native Save → host marker",
  "native-action": "Host sheet → chooser → native Process/Save → host marker",
  "file-provider-ui":
    "Open document → chooser FileProvUI → Activity chrome",
  "credentials-provider":
    "Autofill settings lists this AutofillService by label",
  "call-directory":
    "Call Screening settings UI lists this CallScreeningService by label",
  "print-service":
    "Print services Settings lists this PrintService by label",
  "network-packet-tunnel":
    "System VPN consent/prepare UI for this VpnService shown",
  "notification-service":
    "Local/pre-display shade shows mutated title/body",
  "notification-content":
    "Expand notification → RemoteViews/custom marker",
  "native-notification-content": "Expand → marker on native host",
  "app-intent": "App Actions/shortcuts list shows ET shortcut row",
  "photo-editing":
    "ACTION_EDIT → editor → save → host `lastPayload`/testID marker",
  wallet: "Google Wallet/pass host surface (not companion Activity)",
  "wallet-ui":
    "Companion/issuer Activity chrome (not wallet list alone)",
  spotlight: "AppSearch query hit shows ET marker",
  "spotlight-delegate":
    "Host screen shows registration status on named testID (not dumpsys/PackageManager alone)",
  "bg-download":
    "Host marker updates on Download/WorkManager completion",
  "message-filter": "Filter settings UI lists this service",
  "unwanted-communication":
    "Reporting/screening extras UI lists this service",
  watch: "Wear pair succeeds + companion UI AX shows ET marker/testID",
  "watch-widget":
    "Wear pair succeeds + Wear tile/complication AX shows ET marker string",
};

export function touchpointForId(id: string): TouchpointDef | undefined {
  return TOUCHPOINTS.find((t) => t.id === id);
}

export function androidLockedPForId(id: string): string | undefined {
  return ANDROID_LOCKED_P[id];
}
