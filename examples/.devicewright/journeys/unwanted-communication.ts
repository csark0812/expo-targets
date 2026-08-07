/**
 * Unwanted Communication Reporting deep journey.
 *
 * GREEN (P): pluginkit lists identitylookup.classification-ui + Settings Phone
 * SMS/Call Reporting (or proven alias) lists ET Unwanted Target.
 *
 * Reporting UI invoke (user reports junk) is not required for P — Settings list
 * is the floor (mirrors call-directory). CLAIMS only after S3a proves non-P.
 */
import { spawnSync } from "node:child_process";
import type { DeviceSession } from "@csark0812/devicewright";
import { claimForId } from "../claims";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  dismissSystemAlerts,
  flattenLabels,
  sleep,
  waitForNamed,
} from "./helpers";
import {
  openSettingsApps,
  scrollUntilVisible,
  searchAppsAndOpen,
  tapLabelInTree,
} from "./settings-nav";
import { runAndroidUnwantedCommunicationJourney } from "./unwanted-communication.android";

const SETTINGS_BUNDLE = "com.apple.Preferences";

const EXTENSION_LABELS = [
  "ET Unwanted Target",
  "ET Unwanted",
  "Unwanted",
];

/** Settings labels for the SMS / Call Reporting picker (iOS 18–26 variants). */
const REPORTING_SURFACE_LABELS = [
  "SMS/Call Reporting",
  "SMS / Call Reporting",
  "SMS and Call Reporting",
  "Call Reporting",
  "SMS Reporting",
  "Unwanted Communication Reporting",
  "Reporting",
];

function pluginkitHasClassificationUi(udid: string, appexId: string): boolean {
  const r = spawnSync(
    "xcrun",
    ["simctl", "spawn", udid, "pluginkit", "-mAvvvvv"],
    { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, env: process.env },
  );
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  return (
    out.toLowerCase().includes(appexId.toLowerCase()) &&
    /identitylookup\.classification-ui/i.test(out)
  );
}

async function tryOpenSmsCallReporting(
  device: DeviceSession,
  steps: string[],
): Promise<boolean> {
  // Path A: Settings → Phone → SMS/Call Reporting
  await device.launchApp(SETTINGS_BUNDLE, { terminateRunning: true });
  steps.push("settings-launch");
  await sleep(700);

  const phoneVisible = await scrollUntilVisible(device, ["Phone"], 12);
  if (phoneVisible) {
    const openedPhone = await tapLabelInTree(device, ["Phone"], {
      exactOnly: true,
    });
    if (openedPhone) {
      steps.push("nav:Phone");
      await sleep(600);
      const phoneLabels = flattenLabels(await device.accessibilityTree());
      steps.push(`phone-labels:${phoneLabels.slice(0, 40).join("|")}`);
      if (
        phoneLabels.some((l) =>
          /sms|call reporting|reporting|unwanted/i.test(l),
        )
      ) {
        steps.push("phone-settings-ok");
        const openedReporting = await tapLabelInTree(
          device,
          REPORTING_SURFACE_LABELS,
          { exactOnly: false },
        );
        if (openedReporting) {
          steps.push("sms-call-reporting-nav");
          await sleep(600);
          return true;
        }
        steps.push("sms-call-reporting-nav-failed");
      }
    }
  }

  // Path B: Settings → Apps → Phone (iOS 26 Apps Settings)
  try {
    await openSettingsApps(device, steps);
    await searchAppsAndOpen(device, "Phone", ["Phone"], steps, {
      exactRow: true,
      confirmLabels: [
        "Call Blocking & Identification",
        "Call Blocking and Identification",
        "Announce Calls",
        "Silence Unknown Callers",
        "SMS/Call Reporting",
        "SMS / Call Reporting",
        "Cellular",
        "My Number",
      ],
    });
    steps.push("apps-phone-settings");
    await sleep(800);

    for (let i = 0; i < 6; i++) {
      const labels = flattenLabels(await device.accessibilityTree());
      if (labels.length > 5) break;
      await sleep(400);
    }

    for (let i = 0; i < 5; i++) {
      const opened = await tapLabelInTree(device, REPORTING_SURFACE_LABELS, {
        exactOnly: false,
      });
      if (opened) {
        steps.push("apps-phone-sms-call-reporting");
        await sleep(600);
        return true;
      }
      await device
        .swipe({
          xStart: 210,
          yStart: 720,
          xEnd: 210,
          yEnd: 220,
          duration: 0.35,
        })
        .catch(() => undefined);
      await sleep(400);
    }

    const phoneLabels = flattenLabels(await device.accessibilityTree());
    steps.push(`apps-phone-labels:${phoneLabels.slice(0, 50).join("|")}`);
    if (
      phoneLabels.some((l) =>
        /sms|call reporting|reporting|unwanted/i.test(l),
      )
    ) {
      steps.push("apps-phone-reporting-surface");
      return true;
    }
  } catch (e) {
    steps.push(`apps-phone-settings-unavailable:${String(e).slice(0, 120)}`);
  }

  // Path C: Settings search
  await device.launchApp(SETTINGS_BUNDLE, { terminateRunning: true });
  await sleep(500);
  const searchField = await tapLabelInTree(device, ["Search"]);
  if (searchField) {
    steps.push("settings-search");
    await device.type("SMS/Call Reporting");
    await sleep(800);
    const searchLabels = flattenLabels(await device.accessibilityTree());
    steps.push(`settings-search-labels:${searchLabels.slice(0, 30).join("|")}`);
    if (searchLabels.some((l) => /no results for/i.test(l))) {
      steps.push("settings-search-no-sms-call-reporting");
    } else {
      const opened = await tapLabelInTree(device, REPORTING_SURFACE_LABELS, {
        exactOnly: false,
      });
      if (opened) {
        steps.push("settings-search-sms-call-reporting");
        return true;
      }
    }

    // Alternate query
    await device.launchApp(SETTINGS_BUNDLE, { terminateRunning: true });
    await sleep(400);
    if (await tapLabelInTree(device, ["Search"])) {
      await device.type("Call Reporting");
      await sleep(700);
      const alt = flattenLabels(await device.accessibilityTree());
      steps.push(`settings-search-alt:${alt.slice(0, 25).join("|")}`);
      if (!alt.some((l) => /no results for/i.test(l))) {
        const opened = await tapLabelInTree(device, REPORTING_SURFACE_LABELS, {
          exactOnly: false,
        });
        if (opened) {
          steps.push("settings-search-call-reporting");
          return true;
        }
      } else {
        steps.push("settings-search-no-call-reporting");
      }
    }
  }

  steps.push("sms-call-reporting-unavailable");
  return false;
}

export async function runUnwantedCommunicationJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  if (device.platform === "android") {
    return runAndroidUnwantedCommunicationJourney(device);
  }
  const entry = TARGET_CATALOG["unwanted-communication"];
  const pathStr = entry?.path ?? "examples/unwanted-communication";
  const claim = claimForId("unwanted-communication");
  const steps: string[] = [];
  const appexLabels = [
    entry?.extensionName,
    entry?.hostDisplayName,
    ...EXTENSION_LABELS,
  ].filter(Boolean) as string[];

  try {
    if (!entry) throw new Error("unwanted-communication: missing catalog entry");

    await dismissSystemAlerts(device);
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    steps.push("launch-host");
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 15_000);
    steps.push("host-ready");

    const appexId = `${entry.hostBundleId}.unwanted-communication`;
    if (!pluginkitHasClassificationUi(device.deviceId, appexId)) {
      throw new Error(
        `classification-ui appex missing from pluginkit (${appexId})`,
      );
    }
    steps.push("pluginkit-classification-ui");

    const settingsAvailable = await tryOpenSmsCallReporting(device, steps);
    if (!settingsAvailable) {
      if (claim) {
        return {
          id: "unwanted-communication",
          path: pathStr,
          phase: 5,
          ok: true,
          status: "os-limit",
          steps,
          failureKind: "os-limit",
          error: claim.reason,
        };
      }
      throw new Error(
        "SMS/Call Reporting Settings surface unavailable after Phone / Apps→Phone / search hunt",
      );
    }

    let listed = false;
    for (let i = 0; i < 12; i++) {
      const tree = await device.accessibilityTree();
      const labels = flattenLabels(tree);
      listed = labels.some((l) =>
        appexLabels.some((a) => l.toLowerCase().includes(a.toLowerCase())),
      );
      if (listed) break;
      await sleep(450);
    }

    if (listed) {
      steps.push("unwanted-communication-listed");
      const opened = await tapLabelInTree(device, appexLabels);
      if (opened) steps.push("unwanted-communication-opened");
      return {
        id: "unwanted-communication",
        path: pathStr,
        phase: 5,
        ok: true,
        status: "green",
        steps,
      };
    }

    const finalLabels = flattenLabels(await device.accessibilityTree());
    steps.push(`reporting-list-labels:${finalLabels.slice(0, 60).join("|")}`);
    steps.push("unwanted-communication-not-listed");

    if (claim) {
      return {
        id: "unwanted-communication",
        path: pathStr,
        phase: 5,
        ok: true,
        status: "os-limit",
        steps,
        failureKind: "os-limit",
        error: claim.reason,
      };
    }

    throw new Error(
      `ET Unwanted Target not listed on SMS/Call Reporting; labels=${finalLabels.slice(0, 80).join(", ")}`,
    );
  } catch (e) {
    const msg = String(e);
    const failureKind = /not installed|Unable to find|Launch failed/i.test(msg)
      ? "operator"
      : "product";
    return {
      id: "unwanted-communication",
      path: pathStr,
      phase: 5,
      ok: false,
      status: failureKind === "operator" ? "operator" : "red",
      steps,
      error: msg,
      failureKind,
    };
  }
}
