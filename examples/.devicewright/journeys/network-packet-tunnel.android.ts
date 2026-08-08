/**
 * Android dual of network-packet-tunnel — system VPN consent/prepare UI (Non-Settings).
 * Master Locked P: VpnService.prepare consent dialog for this service shown.
 * DeviceSession only. Green on consent chrome; else os-limit after honest attempt.
 */
import type { DeviceSession } from "@csark0812/devicewright";
import { claimForId } from "../claims";
import { hostLaunchId,
  TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  assertPayloadContains,
  dismissSystemAlerts,
  flattenLabels,
  hostReadyTestId,
  sleep,
  tapId,
  waitForId,
  ANDROID_POST_TAP_MS,
  ANDROID_SETTINGS_SETTLE_MS,
} from "./helpers";

const CONSENT_MARKERS = [
  "Connection request",
  "VPN",
  "ET NETunnel Target",
  "ET NETunnel",
  "networkpackettunnel",
  "wants to set up a VPN connection",
  "Attention",
] as const;

const APP_LABEL_MARKERS = [
  "ET NETunnel Target",
  "ET NETunnel",
  "networkpackettunnel",
] as const;

function labelsHit(labels: string[], needles: readonly string[]): boolean {
  const lower = labels.map((l) => l.toLowerCase());
  return needles.some((n) =>
    lower.some((l) => l === n.toLowerCase() || l.includes(n.toLowerCase())),
  );
}

function isVpnConsentUi(labels: string[]): boolean {
  const hasConsentShape =
    labelsHit(labels, [
      "Connection request",
      "wants to set up a VPN connection",
      "VPN connection",
    ]) ||
    (labelsHit(labels, ["VPN"]) &&
      labelsHit(labels, ["OK", "Allow", "Cancel"]));
  const hasApp = labelsHit(labels, APP_LABEL_MARKERS);
  // Consent dialog naming the app, or classic Connection request chrome.
  return (
    (hasConsentShape && (hasApp || labelsHit(labels, CONSENT_MARKERS))) ||
    (labelsHit(labels, ["Connection request"]) && hasApp)
  );
}

async function waitForConsent(
  device: DeviceSession,
  timeoutMs = 10_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (isVpnConsentUi(flattenLabels(await device.accessibilityTree()))) {
      return true;
    }
    await sleep(400);
  }
  return false;
}

export async function runAndroidNetworkPacketTunnelJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["network-packet-tunnel"];
  const pathStr = entry?.path ?? "examples/network-packet-tunnel";
  const claim = claimForId("network-packet-tunnel", "android");
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("network-packet-tunnel: missing catalog entry");
    const pkg = hostLaunchId(entry, "android");

    steps.push("android-launch-host");
    await device.launchApp(pkg, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await waitForId(device, hostReadyTestId(entry.testIds), 15_000);
    steps.push("host-ready");

    await tapId(device, "btn-vpn-status", 5_000);
    await assertPayloadContains(
      device,
      entry.testIds.lastPayload,
      "vpn:registered-fail-closed",
      6_000,
    );
    steps.push("vpn-registered-marker");

    await tapId(device, "btn-vpn-prepare", 8_000);
    steps.push("vpn-prepare-attempt");
    await sleep(ANDROID_SETTINGS_SETTLE_MS);
    await dismissSystemAlerts(device);

    try {
      await assertPayloadContains(
        device,
        entry.testIds.lastPayload,
        "vpn-prepare:",
        4_000,
      );
      steps.push("vpn-prepare-host-acked");
    } catch {
      steps.push("vpn-prepare-host-ack-miss");
    }

    const consent = await waitForConsent(device, 10_000);
    if (consent) {
      steps.push("vpn-consent-ui-shown");
      return {
        id: "network-packet-tunnel",
        path: pathStr,
        phase: 5,
        ok: true,
        status: "green",
        steps: [...steps, "network-packet-tunnel-android-consent-ok"],
      };
    }

    // already-consented: no dialog — not green (Master requires consent UI shown).
    const labels = flattenLabels(await device.accessibilityTree());
    steps.push("vpn-consent-ui-miss");
    return {
      id: "network-packet-tunnel",
      path: pathStr,
      phase: 5,
      ok: true,
      status: "os-limit",
      steps,
      failureKind: "os-limit",
      error:
        claim?.reason ??
        `VPN consent/prepare UI miss; labels=${labels.slice(0, 80).join(", ")}`,
    };
  } catch (e) {
    const msg = String(e);
    const failureKind =
      /not installed|Launch failed|device offline|no devices|pressButton/i.test(
        msg,
      )
        ? "operator"
        : "product";
    return {
      id: "network-packet-tunnel",
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
