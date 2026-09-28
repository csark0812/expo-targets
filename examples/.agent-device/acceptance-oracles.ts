type Platform = "ios" | "android";

type StepOracle = {
  name: string;
  pattern: RegExp;
  example: string;
};

const exact = (step: string): StepOracle => ({
  name: step,
  pattern: new RegExp(`^${step.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
  example: step,
});

const prefix = (name: string, value: string): StepOracle => ({
  name,
  pattern: new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
  example: `${value}fixture`,
});

const ORACLES: Record<Platform, Record<string, readonly StepOracle[]>> = {
  ios: {
    messages: [
      exact("assert-extension-visible"),
      exact("extension-rn-ready"),
      exact("assert-compact"),
      exact("assert-re-expanded"),
      exact("assert-host-payload"),
      exact("assert-session-payload"),
      exact("assert-attachment-payload"),
    ],
    stickers: [
      exact("stickers-browser-surface-ok"),
      exact("fun-pack-ok"),
      prefix("sticker draft coordinate", "sticker-draft:"),
      exact("sticker-insert-proof"),
    ],
    clip: [
      exact("clip-surface-ok"),
      exact("clip-checkout-tapped"),
      exact("invocation-marker-ok"),
    ],
    "native-clip": [
      exact("appclip-native-ok"),
      exact("clip-surface-ok"),
      exact("clip-checkout-tapped"),
      exact("invocation-marker-ok"),
    ],
    "notification-service": [
      exact("apns-credentials-present"),
      exact("apns-remote-send:200"),
      prefix("notification nonce", "title-nonce:"),
      exact("nse-mutated-title-lockscreen"),
      exact("nse-mutated-title-appgroup"),
    ],
    "notification-content": [
      exact("push-category"),
      exact("notification-surface"),
      exact("expand-notification"),
      exact("nce-content-ui"),
    ],
    "native-notification-content": [
      exact("push-category"),
      exact("notification-surface"),
      exact("expand-notification"),
      exact("nce-content-ui"),
    ],
    "live-activity": [
      exact("start-live"),
      exact("live-id-set"),
      exact("update-live"),
      exact("update-status-reflected"),
      exact("lock-screen"),
      exact("lock-activity-visible"),
      exact("end-live"),
      exact("end-confirmed"),
    ],
    watch: [exact("watch-pair-status:connected"), exact("watch-ui-visible")],
    "watch-widget": [
      exact("watch-pair-status:connected"),
      exact("watch-widget-nested"),
      exact("watch-ui-visible"),
    ],
  },
  android: {
    "notification-service": [
      exact("fcm-credentials-present"),
      exact("fcm-remote-send:200"),
      exact("shade-mutated-title-body"),
      exact("notification-service-android-fcm-shade-ok"),
    ],
    "notification-content": [
      exact("fcm-credentials-present"),
      exact("fcm-remote-send:200"),
      exact("nce-remoteviews-marker-fcm"),
      exact("notification-content-android-nce-fcm-ok"),
    ],
    "native-notification-content": [
      exact("post-rich-payload-ok"),
      exact("nce-remoteviews-marker"),
      exact("native-notification-content-android-nce-ok"),
    ],
    watch: [
      exact("wear-pair-status:connected"),
      exact("companion-ui-et-marker"),
      exact("watch-android-ok"),
    ],
    "watch-widget": [
      exact("wear-pair-status:connected"),
      exact("wear-tile-et-marker"),
      exact("watch-widget-android-ok"),
    ],
  },
};

export function missingGreenOracles(
  platform: Platform,
  id: string,
  steps: readonly string[],
): string[] {
  return (ORACLES[platform][id] ?? [])
    .filter((oracle) => !steps.some((step) => oracle.pattern.test(step)))
    .map((oracle) => oracle.name);
}

/** Fixture helper; production acceptance uses only missingGreenOracles. */
export function greenOracleExamples(platform: Platform, id: string): string[] {
  return (ORACLES[platform][id] ?? []).map((oracle) => oracle.example);
}
