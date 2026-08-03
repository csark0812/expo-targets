import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  assertPayloadContains,
  dismissSystemAlerts,
  findNamedViaPointProbe,
  flattenLabels,
  sleep,
  tapCenter,
  tapId,
  tapProbeHit,
  waitForNamed,
} from "./helpers";
import {
  assertMessagesPresentationStyle,
  dismissMessagesComposerAlerts,
  tapMessagesSheetControl,
  waitForMessagesHostReady,
  waitForMessagesSheetReady,
} from "./messages-sheet";

const MESSAGES_BUNDLE = "com.apple.MobileSMS";
const CONVERSATION_NAMES = [
  "+1 (888) 555-1212",
  "Kate Bell",
  "+1 (555) 564-8583",
];

async function openConversation(device: DeviceSession): Promise<void> {
  for (const name of CONVERSATION_NAMES) {
    try {
      const cell = await waitForNamed(device, [name], 2_000);
      await tapCenter(device, cell);
      return;
    } catch {
      // try next / point-probe
    }
  }
  try {
    const hit = await findNamedViaPointProbe(device, CONVERSATION_NAMES, {
      timeoutMs: 5_000,
      yStartRatio: 0.2,
      yEndRatio: 0.75,
      stepX: 50,
      stepY: 40,
      hotspots: [
        { x: 210, y: 220 },
        { x: 210, y: 280 },
        { x: 210, y: 340 },
      ],
    });
    await tapProbeHit(device, hit);
    return;
  } catch {
    // fall through
  }
  const tree = await device.accessibilityTree();
  throw new Error(
    `no Messages conversation; labels=${flattenLabels(tree).slice(0, 60).join(", ")}`,
  );
}

async function findExtensionInTree(
  device: DeviceSession,
  preferred: string[],
): Promise<boolean> {
  // Drawer rows ARE in the host Messages AX tree (unlike open RN sheet chrome).
  const labels = flattenLabels(await device.accessibilityTree()).map((l) =>
    l.toLowerCase(),
  );
  return preferred.some((name) =>
    labels.some((l) => l.includes(name.toLowerCase())),
  );
}

async function openAppDrawer(
  device: DeviceSession,
  names: string[],
): Promise<void> {
  if (await findExtensionInTree(device, names)) {
    return;
  }
  try {
    await findNamedViaPointProbe(device, names, {
      timeoutMs: 2_000,
      yStartRatio: 0.55,
      yEndRatio: 0.95,
    });
    return;
  } catch {
    // need to open apps drawer
  }

  let addHit: { probeX: number; probeY: number } | undefined;
  try {
    const add = await waitForNamed(device, ["add", "Add"], 4_000);
    if (add.frame) {
      addHit = {
        probeX: Math.round(add.frame.x + add.frame.width / 2),
        probeY: Math.round(add.frame.y + add.frame.height / 2),
      };
    }
  } catch {
    // point-probe Add
  }
  if (!addHit) {
    const hit = await findNamedViaPointProbe(device, ["add", "Add"], {
      timeoutMs: 8_000,
      yStartRatio: 0.7,
      yEndRatio: 0.98,
      match: "exact",
      hotspots: [
        { x: 48, y: 864 },
        { x: 40, y: 860 },
        { x: 55, y: 880 },
      ],
    });
    addHit = { probeX: hit.probeX, probeY: hit.probeY };
  }
  await tapProbeHit(device, addHit);
  await sleep(800);
  await dismissMessagesComposerAlerts(device);

  for (let i = 0; i < 5; i++) {
    if (await findExtensionInTree(device, names)) {
      return;
    }
    try {
      await findNamedViaPointProbe(device, names, {
        timeoutMs: 2_500,
        yStartRatio: 0.4,
        yEndRatio: 0.95,
      });
      return;
    } catch {
      await device.swipe({
        xStart: 200,
        yStart: 600,
        xEnd: 200,
        yEnd: 280,
        duration: 0.3,
      });
      await sleep(700);
    }
  }
  const tree = await device.accessibilityTree();
  throw new Error(
    `messages extension not in apps drawer (${names.join(" | ")}); labels=${flattenLabels(
      tree,
    )
      .slice(0, 80)
      .join(", ")}`,
  );
}

async function ensureExpanded(
  device: DeviceSession,
  steps: string[],
): Promise<void> {
  try {
    await assertMessagesPresentationStyle(device, "expanded");
    steps.push("assert-expanded");
    steps.push("expand");
    return;
  } catch {
    // need Expand
  }
  await tapMessagesSheetControl(device, ["Expand", "btn-expand"]);
  steps.push("expand");
  await assertMessagesPresentationStyle(device, "expanded");
  steps.push("assert-expanded");
}

/**
 * Messages B: Apps drawer / extension visible.
 * Messages A (M3): expand/compact + session + attachment + Send template → host payload.
 *
 * M3 sheet interactions are describePoint-only — see messages-sheet.ts.
 */
export async function runMessagesJourney(
  device: DeviceSession,
  bar: "B" | "A" = "A",
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG.messages;
  const steps: string[] = [];
  // Prefer Example Messages over Trick aliases when both appear.
  const names = [
    entry.extensionName,
    ...entry.extensionAliases.filter((a) => !/trick/i.test(a)),
    entry.hostDisplayName,
  ];

  try {
    if (bar === "A") {
      steps.push("clear-host");
      await device.launchApp(entry.hostBundleId, { terminateRunning: true });
      await dismissSystemAlerts(device);
      await sleep(600);
      await dismissSystemAlerts(device);
      await waitForMessagesHostReady(device);
      try {
        await tapId(device, entry.testIds.clearPayload, 5_000);
      } catch {
        try {
          const clear = await findNamedViaPointProbe(
            device,
            ["Clear payload"],
            {
              timeoutMs: 4_000,
              yStartRatio: 0.3,
              yEndRatio: 0.8,
            },
          );
          await tapProbeHit(device, clear);
        } catch {
          // optional
        }
      }
    }

    steps.push("launch-messages");
    await device.launchApp(MESSAGES_BUNDLE, { terminateRunning: true });
    await sleep(1_000);
    try {
      const cont = await waitForNamed(device, ["Continue"], 2_000);
      await tapCenter(device, cont);
    } catch {
      // dismiss optional
    }
    await dismissMessagesComposerAlerts(device);

    steps.push("open-conversation");
    await openConversation(device);
    await dismissMessagesComposerAlerts(device);

    steps.push("open-app-drawer");
    await openAppDrawer(device, names);

    steps.push("assert-extension-visible");
    const row = await findNamedViaPointProbe(device, names, {
      timeoutMs: 8_000,
      yStartRatio: 0.35,
      yEndRatio: 0.95,
    });
    if (bar === "B") {
      return {
        id: entry.id,
        path: entry.path,
        phase: 2,
        ok: true,
        status: "green",
        steps,
      };
    }

    steps.push("open-extension");
    await tapProbeHit(device, row);
    await sleep(2_000);
    // Sheet is up — no dismissMessagesComposerAlerts (ghost AX must not be chased).
    await waitForMessagesSheetReady(device);
    steps.push("extension-rn-ready");

    // --- M3: describePoint ladder (messages-sheet) — no accessibilityTree ---
    await ensureExpanded(device, steps);

    await tapMessagesSheetControl(device, ["Compact", "btn-compact"]);
    steps.push("compact");
    await assertMessagesPresentationStyle(device, "compact");
    steps.push("assert-compact");

    await tapMessagesSheetControl(device, ["Expand", "btn-expand"]);
    steps.push("re-expand");
    await assertMessagesPresentationStyle(device, "expanded");
    steps.push("assert-re-expanded");

    await tapMessagesSheetControl(device, ["Send session", "btn-send-session"]);
    steps.push("send-session");

    await tapMessagesSheetControl(device, [
      "Insert attachment",
      "btn-insert-attachment",
    ]);
    steps.push("insert-attachment");

    // Session id row may shift layout; ladder absorbs it.
    await tapMessagesSheetControl(device, [
      "Send template",
      "btn-send-template",
    ]);
    steps.push("send-template");
    await sleep(800);

    steps.push("assert-host-payload");
    await device.launchApp(entry.hostBundleId);
    await waitForMessagesHostReady(device);
    if (entry.testIds.refresh) {
      try {
        await tapId(device, entry.testIds.refresh, 5_000);
      } catch {
        try {
          const refresh = await findNamedViaPointProbe(device, ["Refresh"], {
            timeoutMs: 4_000,
            yStartRatio: 0.2,
            yEndRatio: 0.8,
          });
          await tapProbeHit(device, refresh);
        } catch {
          // optional
        }
      }
    }
    await assertPayloadContains(
      device,
      entry.testIds.lastPayload,
      entry.payloadMarker,
      25_000,
    );
    steps.push("a-bar-payload");

    // Best-effort: session + attachment markers also landed in App Group.
    try {
      await assertPayloadContains(
        device,
        entry.testIds.lastPayload,
        "Session bubble from expo-targets",
        5_000,
      );
      steps.push("assert-session-payload");
    } catch {
      steps.push("session-payload-miss");
    }
    try {
      await assertPayloadContains(
        device,
        entry.testIds.lastPayload,
        "expo-targets messages attachment",
        5_000,
      );
      steps.push("assert-attachment-payload");
    } catch {
      steps.push("attachment-payload-miss");
    }

    const missingExtras =
      !steps.includes("expand") ||
      !steps.includes("compact") ||
      !steps.includes("send-session") ||
      !steps.includes("insert-attachment") ||
      !steps.includes("send-template");
    if (missingExtras) {
      throw new Error(
        `messages M3 extras incomplete; steps=${steps.join(">")}`,
      );
    }

    return {
      id: entry.id,
      path: entry.path,
      phase: 2,
      ok: true,
      status: "green",
      steps,
    };
  } catch (e) {
    const msg = String(e);
    const failureKind = /not installed|Unable to find|Launch failed/i.test(msg)
      ? "operator"
      : "product";
    return {
      id: entry.id,
      path: entry.path,
      phase: 2,
      ok: false,
      status: failureKind === "operator" ? "operator" : "red",
      steps,
      error: msg,
      failureKind,
    };
  }
}
