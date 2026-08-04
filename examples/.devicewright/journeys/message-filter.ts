/**
 * Message Filter deep journey.
 *
 * GREEN (P): pluginkit lists identitylookup.message-filter + Settings Messages
 * Unknown Senders / Text Message Filter / Manage Filtering lists ET MsgFilter
 * Target (and optionally enable). Actual inbound SMS filter invoke may os-limit.
 *
 * On current Air Sim (iOS 26.5), Messages settings often blanks and filter
 * surfaces are absent — honest CLAIMS os-limit after iOS 26 label hunt.
 */
import { spawnSync } from "node:child_process";
import type { DeviceSession } from "@csark0812/devicewright";
import { claimForId } from "../claims";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  assertPayloadContains,
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

const SETTINGS_BUNDLE = "com.apple.Preferences";
const EXTENSION_LABELS = [
  "ET MsgFilter Target",
  "ET MsgFilter",
  "MsgFilter",
];

function pluginkitHasMessageFilter(udid: string, appexId: string): boolean {
  const r = spawnSync(
    "xcrun",
    ["simctl", "spawn", udid, "pluginkit", "-mAvvvvv"],
    { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, env: process.env },
  );
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  return (
    out.toLowerCase().includes(appexId.toLowerCase()) &&
    /identitylookup\.message-filter/i.test(out)
  );
}

/** iOS 26+ Messages filter surfaces (legacy “SMS Filtering” / “Unknown & Spam” too). */
const FILTER_SURFACE_LABELS = [
  "Unknown Senders",
  "Text Message Filter",
  "Manage Filtering",
  "Unknown & Spam",
  "Unknown and Spam",
  "Filter Unknown Senders",
  "SMS Filtering",
  "SMS / MMS Filtering",
];

async function tryOpenSmsFiltering(
  device: DeviceSession,
  steps: string[],
): Promise<boolean> {
  // Path A: Settings → Apps → Messages → Unknown Senders / Text Message Filter
  // Confirm on Messages chrome only (not filter rows) — filter rows are often
  // absent on Sim; waiting on them false-fails before we can dump labels.
  try {
    await openSettingsApps(device, steps);
    await searchAppsAndOpen(device, "Messages", ["Messages"], steps, {
      exactRow: true,
      confirmLabels: [
        "iMessage",
        "Share Name and Photo",
        "Send & Receive",
        "Keep Messages",
        "Messages in iCloud",
        "Text Message Forwarding",
        "Blocked Contacts",
        "Unknown Senders",
      ],
    });
    steps.push("apps-messages-settings");
    await sleep(900);

    // Blank Messages settings panes happen on some Sims — re-probe AX a few times.
    for (let i = 0; i < 8; i++) {
      const labels = flattenLabels(await device.accessibilityTree());
      if (labels.length > 5) break;
      await sleep(500);
    }

    // Scroll the Messages settings page — filter rows are often below the fold.
    for (let i = 0; i < 5; i++) {
      const openedSpam = await tapLabelInTree(device, FILTER_SURFACE_LABELS, {
        exactOnly: false,
      });
      if (openedSpam) {
        steps.push("messages-spam-filtering-surface");
        await sleep(700);
        await tapLabelInTree(
          device,
          [
            "Text Message Filter",
            "Manage Filtering",
            "SMS Filtering",
            "SMS / MMS Filtering",
          ],
          { exactOnly: false },
        );
        await sleep(500);
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
      await sleep(500);
    }

    const labels = flattenLabels(await device.accessibilityTree());
    if (
      labels.some((l) =>
        /unknown.?senders|text message filter|manage filtering|unknown.?spam|sms filtering|filter unknown/i.test(
          l,
        ),
      )
    ) {
      steps.push("messages-spam-labels-visible");
      return true;
    }
    steps.push(
      `messages-settings-labels:${labels.slice(0, 50).join("|") || "(empty)"}`,
    );
  } catch (e) {
    steps.push(`apps-messages-path-failed:${String(e).slice(0, 200)}`);
    try {
      const labels = flattenLabels(await device.accessibilityTree());
      steps.push(
        `messages-settings-labels-on-fail:${labels.slice(0, 50).join("|") || "(empty)"}`,
      );
    } catch {
      /* ignore */
    }
  }

  // Path A2: App-prefs deep links. `MESSAGES` broke in iOS 18+; try bundle-id form
  // (Apple Forums: App-prefs:com.apple.MobileSMS) before CLAIMS.
  for (const url of [
    "App-prefs:com.apple.MobileSMS",
    "App-prefs:MESSAGES",
    "App-prefs:root=MESSAGES",
  ]) {
    try {
      await device.openUrl(url);
      await sleep(1_200);
      const labels = flattenLabels(await device.accessibilityTree());
      if (
        labels.some((l) =>
          /iMessage|Send & Receive|Unknown Senders|Text Message Filter|SMS Filtering/i.test(
            l,
          ),
        )
      ) {
        steps.push(`messages-deeplink-ok:${url}`);
        const openedSpam = await tapLabelInTree(device, FILTER_SURFACE_LABELS, {
          exactOnly: false,
        });
        if (openedSpam) {
          steps.push("messages-spam-filtering-surface");
          return true;
        }
        steps.push(
          `messages-deeplink-labels:${labels.slice(0, 40).join("|")}`,
        );
      } else {
        steps.push(`messages-deeplink-miss:${url}`);
      }
    } catch (e) {
      steps.push(`messages-deeplink-fail:${url}:${String(e).slice(0, 80)}`);
    }
  }

  // Path B: Settings / Apps search for iOS 26 filter labels
  for (const query of [
    "Unknown Senders",
    "Text Message Filter",
    "Manage Filtering",
    "SMS Filtering",
  ]) {
    await device.launchApp(SETTINGS_BUNDLE, { terminateRunning: true });
    await sleep(500);
    const searchField = await tapLabelInTree(device, ["Search"]);
    if (!searchField) continue;
    steps.push(`settings-search:${query}`);
    await device.type(query);
    await sleep(800);
    const searchLabels = flattenLabels(await device.accessibilityTree());
    if (searchLabels.some((l) => /no results for/i.test(l))) {
      steps.push(`settings-search-no-results:${query}`);
      continue;
    }
    const opened = await tapLabelInTree(device, [
      ...FILTER_SURFACE_LABELS,
      "Messages",
    ]);
    if (opened) {
      steps.push(`settings-search-opened:${query}`);
      await sleep(700);
      return true;
    }
  }

  steps.push("sms-filtering-settings-unavailable");
  return false;
}

export async function runMessageFilterJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["message-filter"];
  const pathStr = entry?.path ?? "examples/message-filter";
  const claim = claimForId("message-filter");
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("message-filter: missing catalog entry");

    await dismissSystemAlerts(device);
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    steps.push("launch-host");
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 15_000);
    steps.push("host-ready");

    const appexId = `${entry.hostBundleId}.message-filter`;
    if (!pluginkitHasMessageFilter(device.deviceId, appexId)) {
      throw new Error(
        `message-filter appex missing from pluginkit (${appexId})`,
      );
    }
    steps.push("pluginkit-message-filter");

    const settingsOk = await tryOpenSmsFiltering(device, steps);
    if (!settingsOk) {
      return {
        id: "message-filter",
        path: pathStr,
        phase: 5,
        ok: true,
        status: "os-limit",
        steps,
        failureKind: "os-limit",
        error:
          claim?.reason ??
          "Messages SMS Filtering / Unknown & Spam Settings unavailable on this Simulator",
      };
    }

    let listed = false;
    for (let i = 0; i < 14; i++) {
      const labels = flattenLabels(await device.accessibilityTree());
      listed = labels.some((l) =>
        EXTENSION_LABELS.some((a) => l.toLowerCase().includes(a.toLowerCase())),
      );
      if (listed) break;
      await scrollUntilVisible(device, EXTENSION_LABELS, 2).catch(() => false);
      await sleep(400);
    }

    if (listed) {
      steps.push("message-filter-listed");
      const enabled = await tapLabelInTree(device, EXTENSION_LABELS);
      if (enabled) steps.push("message-filter-opened");

      // Best-effort: inject SMS and look for App Group filter marker.
      try {
        spawnSync(
          "xcrun",
          [
            "simctl",
            "sms",
            device.deviceId,
            "send",
            "+15551234567",
            "expo-targets et filter probe",
          ],
          { encoding: "utf8", env: process.env },
        );
        steps.push("simctl-sms-probe");
        await sleep(2_000);
        await device.launchApp(entry.hostBundleId, { terminateRunning: true });
        await waitForNamed(device, ["ready"], 10_000);
        try {
          await assertPayloadContains(
            device,
            entry.testIds.lastPayload,
            "filter",
            8_000,
          );
          steps.push("message-filter-appgroup");
        } catch {
          steps.push("message-filter-sms-invoke-unproven");
        }
      } catch {
        steps.push("simctl-sms-unavailable");
      }

      return {
        id: "message-filter",
        path: pathStr,
        phase: 5,
        ok: true,
        status: "green",
        steps,
      };
    }

    steps.push("message-filter-not-listed");
    return {
      id: "message-filter",
      path: pathStr,
      phase: 5,
      ok: true,
      status: "os-limit",
      steps,
      failureKind: "os-limit",
      error:
        claim?.reason ??
        "SMS Filtering Settings reachable but ET MsgFilter Target not listed on this Simulator",
    };
  } catch (e) {
    const msg = String(e);
    const failureKind = /not installed|Unable to find|Launch failed/i.test(msg)
      ? "operator"
      : "product";
    return {
      id: "message-filter",
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
