export type CapabilityDisposition =
  | "agent-device-client"
  | "agent-device-public-subpath"
  | "fixture-only-platform-command"
  | "blocker";

export type CapabilityMapping = {
  primitive: string;
  replacement: string;
  disposition: CapabilityDisposition;
  loadBearing: boolean;
  affectedRows?: readonly string[];
  platforms?: readonly ("ios" | "android")[];
};

/**
 * Audited replacement ledger for every DeviceSession primitive used by the
 * REQUIRED matrices at the public fork cutover. A blocker is never an os-limit.
 */
export const CAPABILITY_LEDGER: readonly CapabilityMapping[] = [
  { primitive: "launchApp", replacement: "client.apps.open", disposition: "agent-device-client", loadBearing: true },
  { primitive: "terminateApp", replacement: "client.apps.close", disposition: "agent-device-client", loadBearing: true },
  { primitive: "accessibilityTree", replacement: "client.capture.snapshot", disposition: "agent-device-client", loadBearing: true },
  { primitive: "tap", replacement: "client.interactions.press", disposition: "agent-device-client", loadBearing: true },
  { primitive: "swipe", replacement: "client.interactions.swipe", disposition: "agent-device-client", loadBearing: true },
  { primitive: "type", replacement: "client.interactions.type", disposition: "agent-device-client", loadBearing: true },
  { primitive: "home", replacement: "client.command.home", disposition: "agent-device-client", loadBearing: true },
  { primitive: "back", replacement: "client.command.back", disposition: "agent-device-client", loadBearing: true },
  { primitive: "openUrl", replacement: "client.apps.open({url})", disposition: "agent-device-client", loadBearing: true },
  { primitive: "setPrivacy", replacement: "client.settings.update", disposition: "agent-device-client", loadBearing: true },
  { primitive: "pushNotification", replacement: "client.apps.push", disposition: "agent-device-client", loadBearing: true },
  { primitive: "screenshot", replacement: "client.capture.screenshot", disposition: "agent-device-client", loadBearing: false },
  { primitive: "trace", replacement: "client.recording.trace + repo event trace", disposition: "agent-device-client", loadBearing: false },
  { primitive: "android-ime", replacement: "agent-device/android-adb", disposition: "agent-device-public-subpath", loadBearing: true },
  { primitive: "android-share-intent", replacement: "agent-device Android adb provider", disposition: "agent-device-public-subpath", loadBearing: false },
  { primitive: "addMedia", replacement: "simctl addmedia / adb media scan", disposition: "fixture-only-platform-command", loadBearing: false },
  { primitive: "release-install", replacement: "Expo build + agent-device install readiness", disposition: "fixture-only-platform-command", loadBearing: false },
  {
    primitive: "launchApp(env)",
    replacement: "client.apps.open({ launchEnvironment })",
    disposition: "agent-device-client",
    loadBearing: true,
    affectedRows: ["clip", "native-clip"],
    platforms: ["ios"],
  },
  {
    primitive: "describePoint",
    replacement: "client.capture.inspectPoint",
    disposition: "agent-device-client",
    loadBearing: true,
    affectedRows: ["messages", "share", "action", "stickers"],
    platforms: ["ios"],
  },
  {
    primitive: "lock",
    replacement: "client.command.screenLock",
    disposition: "agent-device-client",
    loadBearing: true,
    affectedRows: ["notification-service", "notification-content", "live-activity"],
    platforms: ["ios"],
  },
  {
    primitive: "wear-pair",
    replacement: "client.devices.pairWearable",
    disposition: "agent-device-client",
    loadBearing: true,
    affectedRows: ["watch", "watch-widget"],
  },
] as const;

export function blockingCapabilities(
  ids?: Iterable<string>,
  platform?: "ios" | "android",
): CapabilityMapping[] {
  const selected = ids ? new Set(ids) : undefined;
  return CAPABILITY_LEDGER.filter(
    (entry) =>
      entry.disposition === "blocker" &&
      entry.loadBearing &&
      (!platform || !entry.platforms || entry.platforms.includes(platform)) &&
      (!selected || entry.affectedRows?.some((id) => selected.has(id))),
  );
}
