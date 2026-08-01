import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  assertPayloadContains,
  dismissSystemAlerts,
  findNamedViaPointProbe,
  flattenLabels,
  hostReadyTestId,
  sleep,
  tapCenter,
  tapId,
  tapProbeHit,
  waitForId,
  waitForNamed,
} from "./helpers";

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
  // iOS 26: ConversationList often empty in describe-all — probe rows.
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

async function openAppDrawer(
  device: DeviceSession,
  names: string[],
): Promise<void> {
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
    });
    addHit = { probeX: hit.probeX, probeY: hit.probeY };
  }
  await tapProbeHit(device, addHit);
  await sleep(800);

  for (let i = 0; i < 5; i++) {
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

/**
 * Messages B: Apps drawer / extension visible.
 * Messages A: send template → host text-last-payload marker.
 */
export async function runMessagesJourney(
  device: DeviceSession,
  bar: "B" | "A" = "A",
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG.messages;
  const steps: string[] = [];
  const names = [
    entry.extensionName,
    entry.hostDisplayName,
    ...entry.extensionAliases,
  ];

  try {
    if (bar === "A") {
      steps.push("clear-host");
      await device.launchApp(entry.hostBundleId, { terminateRunning: true });
      await dismissSystemAlerts(device);
      await waitForId(device, hostReadyTestId(entry.testIds), 20_000);
      try {
        await tapId(device, entry.testIds.clearPayload, 5_000);
      } catch {
        // optional
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

    steps.push("open-conversation");
    await openConversation(device);

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

    // Grabber expand is optional and slow when missing — skip.

    steps.push("send-template");
    const send = await findNamedViaPointProbe(
      device,
      [entry.completeButton, "btn-send-template", "Send template"],
      {
        timeoutMs: 10_000,
        yStartRatio: 0.25,
        yEndRatio: 0.9,
        stepX: 50,
        stepY: 40,
      },
    );
    await tapProbeHit(device, send);
    await sleep(800);

    steps.push("assert-host-payload");
    await device.launchApp(entry.hostBundleId);
    await waitForId(device, hostReadyTestId(entry.testIds), 15_000);
    if (entry.testIds.refresh) {
      try {
        await tapId(device, entry.testIds.refresh, 5_000);
      } catch {
        // optional
      }
    }
    await assertPayloadContains(
      device,
      entry.testIds.lastPayload,
      entry.payloadMarker,
      25_000,
    );

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
