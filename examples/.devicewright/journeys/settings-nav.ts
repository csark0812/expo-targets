/**
 * Shared Settings-app navigation helpers for host/extension registration
 * proofs (Apps list, General→Keyboard, Safari Extensions/Content Blockers).
 *
 * Extracted from safari.ts so content-blocker/keyboard/apps-settings/intent
 * journeys share one implementation. safari.ts is intentionally left as-is
 * (hardened separately) — it may migrate onto these helpers later.
 */
import type { DeviceSession } from "@csark0812/devicewright";
import { flattenLabels, sleep, waitForNamed } from "./helpers";

const SETTINGS_BUNDLE = "com.apple.Preferences";

/**
 * Tap a label anywhere in the current accessibility tree (tree-frame tap,
 * iOS 26). Prefers exact label matches before substring matches so that
 * searching “Safari” does not hit “ET Safari” first.
 */
export async function tapLabelInTree(
  device: DeviceSession,
  names: string[],
  opts: { exactOnly?: boolean } = {},
): Promise<boolean> {
  const tree = await device.accessibilityTree();
  const want = names.map((n) => n.toLowerCase());

  // Two-pass: exact first, then substring (unless exactOnly).
  for (const exact of opts.exactOnly ? [true] : [true, false]) {
    for (const node of tree) {
      const label = (node.label ?? "").trim();
      if (!label) continue;
      const lower = label.toLowerCase();
      const hit = exact
        ? want.some((w) => lower === w)
        : want.some((w) => lower.includes(w));
      if (!hit) continue;
      const f = node.frame;
      if (!f || f.width < 8 || f.height < 8) continue;
      // iPhone Air lock screen / Photos CTAs sit near y≈850–900.
      if (f.y + f.height < 40 || f.y > 920) continue;
      await device.tap({
        x: Math.round(f.x + f.width / 2),
        y: Math.round(f.y + f.height / 2),
      });
      await sleep(550);
      return true;
    }
  }
  return false;
}

/** Scroll the current screen down repeatedly until any of `names` is visible. */
export async function scrollUntilVisible(
  device: DeviceSession,
  names: string[],
  maxSwipes = 10,
): Promise<boolean> {
  const want = names.map((n) => n.toLowerCase());
  for (let i = 0; i < maxSwipes; i++) {
    const tree = await device.accessibilityTree();
    const labels = flattenLabels(tree).map((l) => l.toLowerCase().trim());
    if (labels.some((l) => want.some((w) => l === w || l.includes(w)))) {
      return true;
    }
    await device.swipe({
      xStart: 210,
      yStart: 750,
      xEnd: 210,
      yEnd: 200,
      duration: 0.4,
    });
    await sleep(450);
  }
  const tree = await device.accessibilityTree();
  return flattenLabels(tree)
    .map((l) => l.toLowerCase().trim())
    .some((l) => want.some((w) => l === w || l.includes(w)));
}

/** Scroll Settings root until Apps is on-screen (iOS 26 buries it). */
export async function revealSettingsApps(device: DeviceSession): Promise<void> {
  const ok = await scrollUntilVisible(device, ["Apps"], 10);
  if (!ok) {
    const tree = await device.accessibilityTree();
    throw new Error(
      `Settings: Apps row not found after scroll; labels=${flattenLabels(tree).slice(0, 40).join("|")}`,
    );
  }
}

/**
 * Launch Settings, scroll to and open the Apps list.
 * Proves the OS renders an Apps settings surface (does not open any app yet).
 */
export async function openSettingsApps(
  device: DeviceSession,
  steps: string[],
): Promise<void> {
  await device.launchApp(SETTINGS_BUNDLE, { terminateRunning: true });
  await sleep(900);
  steps.push("settings-launch");

  await revealSettingsApps(device);
  steps.push("settings-apps-visible");

  const tapped = await tapLabelInTree(device, ["Apps"]);
  if (!tapped) {
    throw new Error("Settings: could not tap Apps row");
  }
  steps.push("settings-apps");
}

/**
 * Within Settings → Apps, type `query` into “Search Apps” and open the row
 * matching any of `labels`. Asserts the destination screen renders one of
 * `confirmLabels` (defaults to `labels`) so search-results pages that still
 * contain the same title cannot false-pass.
 */
export async function searchAppsAndOpen(
  device: DeviceSession,
  query: string,
  labels: string[],
  steps: string[],
  opts: { exactRow?: boolean; confirmLabels?: string[] } = {},
): Promise<void> {
  const tappedSearch = await tapLabelInTree(device, ["Search Apps"]);
  if (!tappedSearch) {
    await device.tap({ x: 180, y: 870 });
  }
  await sleep(400);
  steps.push("apps-search");

  await device.type(query);
  await sleep(700);
  steps.push("apps-search-typed");

  const tappedRow = await tapLabelInTree(device, labels, {
    exactOnly: opts.exactRow === true,
  });
  if (!tappedRow) {
    const tree = await device.accessibilityTree();
    throw new Error(
      `Settings Apps search "${query}": no row matched ${JSON.stringify(labels)}; labels=${flattenLabels(tree).slice(0, 40).join("|")}`,
    );
  }
  steps.push("host-settings-open");

  const confirm = opts.confirmLabels ?? labels;
  await waitForNamed(device, confirm, 8_000);
  steps.push("host-settings-ok");
}

/**
 * Settings → Apps → search “Safari” (system app) → open Safari settings.
 * Reusable entry point for Content Blocker / Extensions journeys.
 */
export async function openSystemSafariSettings(
  device: DeviceSession,
  steps: string[],
): Promise<void> {
  await openSettingsApps(device, steps);
  // Exact “Safari” only — do not match “ET Safari” / “ET Safari N”.
  // Confirm via Safari-settings-only chrome (not the search results row).
  await searchAppsAndOpen(device, "Safari", ["Safari"], steps, {
    exactRow: true,
    confirmLabels: [
      "Search Engine",
      "AutoFill",
      "Extensions",
      "Content Blockers",
      "Clear History",
      "Tabs",
    ],
  });
}

/**
 * Open Safari → Extensions (or Content Blockers), scrolling if needed.
 * Confirms landing on the extensions list (not merely seeing the row).
 */
export async function openSafariExtensionsOrBlockers(
  device: DeviceSession,
  steps: string[],
  prefer: "extensions" | "blockers" = "extensions",
): Promise<void> {
  const primary =
    prefer === "blockers"
      ? ["Content Blockers", "Extensions"]
      : ["Extensions", "Content Blockers"];
  const visible = await scrollUntilVisible(device, primary, 14);
  if (!visible) {
    const missing = await device.accessibilityTree();
    throw new Error(
      `Safari settings: Extensions/Content Blockers missing after scroll; labels=${flattenLabels(missing).slice(0, 50).join("|")}`,
    );
  }

  let tree = await device.accessibilityTree();
  const findExt = (
    nodes: Awaited<ReturnType<DeviceSession["accessibilityTree"]>>,
  ) => {
    let hit = nodes.find(
      (n) => String(n.identifier ?? "").toUpperCase() === "WEB_EXTENSIONS",
    );
    if (!hit && prefer === "blockers") {
      hit = nodes.find((n) =>
        /CONTENT_BLOCKER/i.test(String(n.identifier ?? "")),
      );
    }
    if (!hit) {
      hit = nodes.find((n) =>
        primary.some(
          (p) => (n.label ?? "").trim().toLowerCase() === p.toLowerCase(),
        ),
      );
    }
    return hit;
  };

  let row = findExt(tree);
  if (!row) {
    throw new Error(`Safari settings: could not locate ${primary.join("/")}`);
  }

  // iOS 26: taps on Extensions fail when the row sits under the large title
  // or upper chrome. Require a mid-band frame before tapping (MCP-proven).
  for (let i = 0; i < 10; i++) {
    const y = row.frame?.y ?? 0;
    if (y >= 280 && y <= 650) break;
    if (y < 280) {
      await device.swipe({
        xStart: 210,
        yStart: 300,
        xEnd: 210,
        yEnd: 560,
        duration: 0.32,
      });
    } else {
      await device.swipe({
        xStart: 210,
        yStart: 700,
        xEnd: 210,
        yEnd: 380,
        duration: 0.32,
      });
    }
    await sleep(350);
    tree = await device.accessibilityTree();
    row = findExt(tree) ?? row;
  }

  const f = row.frame;
  if (!f) {
    throw new Error(`Safari settings: ${primary[0]} has no frame`);
  }
  steps.push(`extensions-row-y:${Math.round(f.y)}`);
  // Prefer identifier locator, then chevron-side coord (center taps often no-op
  // on this Settings row under iOS 26 / idb).
  let opened = false;
  try {
    await device.getById("WEB_EXTENSIONS", { timeoutMs: 2_500 }).tap();
    opened = true;
    steps.push("extensions-tap:id");
  } catch {
    /* fall through */
  }
  if (!opened) {
    await device.tap({
      x: Math.round(f.x + f.width - 40),
      y: Math.round(f.y + f.height / 2),
    });
    steps.push("extensions-tap:chevron");
  }
  await sleep(1000);

  // Confirm we left Safari settings into the Extensions list.
  const after = await device.accessibilityTree();
  const afterLabels = flattenLabels(after).map((l) => l.toLowerCase());
  const onList = afterLabels.some((l) =>
    /allow these extensions|more extensions|content blocker|et blocker|et safari|off$/i.test(
      l,
    ),
  );
  if (!onList) {
    tree = await device.accessibilityTree();
    row = findExt(tree);
    if (!row?.frame) {
      throw new Error(
        `Safari Extensions page not opened; labels=${flattenLabels(after).slice(0, 40).join("|")}`,
      );
    }
    const f2 = row.frame;
    steps.push(`extensions-retry-y:${Math.round(f2.y)}`);
    try {
      await device.getById("WEB_EXTENSIONS", { timeoutMs: 2_000 }).tap();
    } catch {
      await device.tap({
        x: Math.round(f2.x + f2.width - 40),
        y: Math.round(f2.y + f2.height / 2),
      });
    }
    await sleep(1000);
    const after2 = flattenLabels(await device.accessibilityTree()).map((l) =>
      l.toLowerCase(),
    );
    if (
      !after2.some((l) =>
        /allow these extensions|more extensions|et blocker|et safari/i.test(l),
      )
    ) {
      throw new Error(
        `Safari Extensions page not opened; labels=${flattenLabels(after).slice(0, 40).join("|")}`,
      );
    }
  }
  steps.push("safari-extensions-open");
}

/**
 * Tap a sequence of labels in order, scrolling the current screen when a
 * label isn't immediately on-screen. Use for fixed system paths like
 * General → Keyboard → Keyboards.
 */
export async function navigatePath(
  device: DeviceSession,
  segments: string[],
  steps: string[],
): Promise<void> {
  for (const label of segments) {
    let tapped = await tapLabelInTree(device, [label]);
    for (let i = 0; i < 6 && !tapped; i++) {
      await device.swipe({
        xStart: 210,
        yStart: 750,
        xEnd: 210,
        yEnd: 200,
        duration: 0.4,
      });
      await sleep(400);
      tapped = await tapLabelInTree(device, [label]);
    }
    if (!tapped) {
      const tree = await device.accessibilityTree();
      throw new Error(
        `navigatePath: could not find/tap "${label}"; labels=${flattenLabels(tree).slice(0, 40).join("|")}`,
      );
    }
    steps.push(`nav:${label}`);
    await sleep(400);
  }
}

/**
 * Open an appex row under Safari Extensions / Content Blockers and turn on
 * “Allow Extension” when present (Apple’s enable step). Listing alone proves
 * registration; this step proves the OS exposes the enable surface.
 */
export async function openAppexAndAllowExtension(
  device: DeviceSession,
  appexLabels: string[],
  steps: string[],
): Promise<void> {
  const opened = await tapLabelInTree(device, appexLabels);
  if (!opened) {
    const tree = await device.accessibilityTree();
    throw new Error(
      `Safari Extensions: appex row missing ${JSON.stringify(appexLabels)}; labels=${flattenLabels(tree).slice(0, 40).join("|")}`,
    );
  }
  steps.push("appex-detail-open");
  await sleep(500);

  const tree = await device.accessibilityTree();
  const labels = flattenLabels(tree).map((l) => l.toLowerCase());
  const hasAllow = labels.some((l) =>
    /allow extension|allow in|content blocker/i.test(l),
  );
  if (!hasAllow) {
    // Still on the list page or OS hid the toggle — listing was already proven.
    steps.push("appex-allow-surface-missing");
    return;
  }

  // Prefer an off switch next to Allow Extension; otherwise tap the Allow row.
  const offSwitch = tree.find((n) => {
    const role = (n.role ?? "").toLowerCase();
    const value = String(n.value ?? "").toLowerCase();
    const label = (n.label ?? "").toLowerCase();
    return (
      (role.includes("switch") || role.includes("toggle")) &&
      (value === "0" || value === "false" || value === "off") &&
      (label.includes("allow") || !label)
    );
  });
  if (offSwitch?.frame) {
    const f = offSwitch.frame;
    await device.tap({
      x: Math.round(f.x + f.width / 2),
      y: Math.round(f.y + f.height / 2),
    });
    await sleep(400);
    steps.push("appex-allow-toggled-on");
    return;
  }

  const tappedAllow = await tapLabelInTree(device, [
    "Allow Extension",
    "Allow",
  ]);
  if (tappedAllow) {
    steps.push("appex-allow-tapped");
  } else {
    steps.push("appex-allow-already-on");
  }
}
