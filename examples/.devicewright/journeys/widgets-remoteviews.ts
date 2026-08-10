import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import { runAndroidWidgetsRemoteViewsJourney } from "./widgets-remoteviews.android";

/**
 * RemoteViews widget journey — Android AppWidget only (no iOS dual).
 */
export async function runWidgetsRemoteViewsJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  if (device.platform === "android") {
    return runAndroidWidgetsRemoteViewsJourney(device);
  }

  const entry = TARGET_CATALOG["widgets-remoteviews"];
  return {
    id: entry.id,
    path: entry.path,
    phase: 3,
    ok: false,
    status: "os-limit",
    steps: ["ios-no-remoteviews-dual"],
    error:
      "HelloRemoteViews is android-only (RemoteViews AppWidget); no iOS WidgetKit dual",
    failureKind: "os-limit",
  };
}
