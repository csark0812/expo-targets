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
  try {
    await waitForNamed(device, confirm, 8_000);
  } catch {
    // Settings search can land on the row without pushing detail — retry tap.
    await tapLabelInTree(device, labels, { exactOnly: opts.exactRow === true });
    await waitForNamed(device, confirm, 8_000);
  }
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

  const stillOnSafariSettings = (
    nodes: Awaited<ReturnType<DeviceSession["accessibilityTree"]>>,
  ) =>
    nodes.some((n) => {
      const id = String(n.identifier ?? "").toUpperCase();
      const label = (n.label ?? "").trim();
      return (
        id === "WEB_EXTENSIONS" ||
        /CONTENT_BLOCKER/i.test(id) ||
        label === "Search Engine" ||
        label === "Content Blockers"
      );
    });

  const onExtensionsList = (
    nodes: Awaited<ReturnType<DeviceSession["accessibilityTree"]>>,
  ) => {
    if (stillOnSafariSettings(nodes)) return false;
    const labels = flattenLabels(nodes).map((l) => l.toLowerCase());
    if (prefer === "blockers") {
      return labels.some((l) =>
        /allow these content blockers|more content blockers|et blocker/i.test(
          l,
        ),
      );
    }
    return labels.some((l) =>
      /allow these extensions|more extensions|et safari/i.test(l),
    );
  };

  let tree = await device.accessibilityTree();
  const findExt = (
    nodes: Awaited<ReturnType<DeviceSession["accessibilityTree"]>>,
  ) => {
    if (prefer === "blockers") {
      const blocker = nodes.find(
        (n) =>
          /CONTENT_BLOCKER/i.test(String(n.identifier ?? "")) ||
          (n.label ?? "").trim().toLowerCase() === "content blockers",
      );
      if (blocker) return blocker;
    }
    let hit = nodes.find(
      (n) => String(n.identifier ?? "").toUpperCase() === "WEB_EXTENSIONS",
    );
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

  const rowId = String(row.identifier ?? "").trim();
  const tryOpen = async (tag: string) => {
    if (rowId) {
      try {
        await device.getById(rowId, { timeoutMs: 2_500 }).tap();
        steps.push(`extensions-tap:id:${tag}`);
        return;
      } catch {
        /* fall through */
      }
    }
    await device.tap({
      x: Math.round(f.x + f.width - 40),
      y: Math.round(f.y + f.height / 2),
    });
    steps.push(`extensions-tap:chevron:${tag}`);
  };

  await tryOpen("1");
  await sleep(1000);

  let after = await device.accessibilityTree();
  if (!onExtensionsList(after)) {
    tree = await device.accessibilityTree();
    row = findExt(tree);
    if (!row?.frame) {
      throw new Error(
        `Safari Extensions page not opened; stillOnSettings=${stillOnSafariSettings(after)}; labels=${flattenLabels(after).slice(0, 40).join("|")}`,
      );
    }
    const f2 = row.frame;
    steps.push(`extensions-retry-y:${Math.round(f2.y)}`);
    const retryId = String(row.identifier ?? "").trim();
    try {
      if (retryId) {
        await device.getById(retryId, { timeoutMs: 2_000 }).tap();
      } else {
        throw new Error("no-id");
      }
    } catch {
      await device.tap({
        x: Math.round(f2.x + f2.width - 40),
        y: Math.round(f2.y + f2.height / 2),
      });
    }
    await sleep(1000);
    after = await device.accessibilityTree();
  }

  if (!onExtensionsList(after)) {
    throw new Error(
      `Safari Extensions page not opened; stillOnSettings=${stillOnSafariSettings(after)}; labels=${flattenLabels(after).slice(0, 40).join("|")}`,
    );
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
    let tapped = await tapLabelInTree(device, [label], { exactOnly: true });
    for (let i = 0; i < 6 && !tapped; i++) {
      await device.swipe({
        xStart: 210,
        yStart: 750,
        xEnd: 210,
        yEnd: 200,
        duration: 0.4,
      });
      await sleep(400);
      tapped = await tapLabelInTree(device, [label], { exactOnly: true });
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

function isAllowOn(value: unknown): boolean {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "on";
}

function isAllowOff(value: unknown): boolean {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  return v === "0" || v === "false" || v === "off" || v === "";
}

/**
 * iOS 26 Settings exposes “Allow Extension” as AXCheckBox / type CheckBox
 * (role_description “switch”). DW nodes use `type` + `identifier`, not
 * `role`. Center taps miss the trailing control — idb-proven: tap ~85% width.
 */
function findAllowExtensionControl(
  tree: Awaited<ReturnType<DeviceSession["accessibilityTree"]>>,
) {
  return (
    tree.find((n) => (n.identifier ?? "").trim() === "Allow Extension") ??
    tree.find((n) => {
      const type = (n.type ?? "").toLowerCase();
      const label = (n.label ?? "").toLowerCase();
      return (
        label.includes("allow extension") &&
        (type.includes("checkbox") ||
          type.includes("switch") ||
          type.includes("toggle"))
      );
    })
  );
}

/** Trailing-switch fractions — center/getById taps are no-ops on this CheckBox. */
const ALLOW_TAP_FRACTIONS = [0.85, 0.8, 0.9] as const;

async function tapAllowExtensionMidRight(
  device: DeviceSession,
  frame: { x: number; y: number; width: number; height: number },
  fraction: number,
): Promise<void> {
  await device.tap({
    x: Math.round(frame.x + frame.width * fraction),
    y: Math.round(frame.y + frame.height / 2),
  });
}

/**
 * Open an appex row under Safari Extensions / Content Blockers and turn on
 * “Allow Extension” when present (Apple’s enable step). Listing alone proves
 * registration; when the enable surface is present this asserts the control
 * ends On (not merely that a label was tapped).
 *
 * Prefer `appexIds` (appex bundle identifiers) — multiple hosts share the
 * display name “ET Safari Target” on the Extensions list.
 */
export async function openAppexAndAllowExtension(
  device: DeviceSession,
  appexLabels: string[],
  steps: string[],
  opts: { appexIds?: string[] } = {},
): Promise<void> {
  const ids = (opts.appexIds ?? []).filter(Boolean);
  let opened = false;
  for (const id of ids) {
    try {
      await device.getById(id, { timeoutMs: 2_500 }).tap();
      opened = true;
      steps.push(`appex-row-tap:id:${id}`);
      break;
    } catch {
      /* try next id / labels */
    }
  }
  if (!opened) {
    // Prefer label that includes On/Off suffix from the list row when ids miss.
    opened = await tapLabelInTree(device, [
      ...appexLabels.flatMap((l) => [`${l}, Off`, `${l}, On`, l]),
    ]);
  }
  if (!opened) {
    const tree = await device.accessibilityTree();
    throw new Error(
      `Safari Extensions: appex row missing ids=${JSON.stringify(ids)} labels=${JSON.stringify(appexLabels)}; tree=${tree
        .map((n) => `${n.identifier ?? ""}:${n.label ?? ""}`)
        .slice(0, 40)
        .join("|")}`,
    );
  }
  steps.push("appex-detail-open");
  await sleep(500);

  let tree = await device.accessibilityTree();
  let allow = findAllowExtensionControl(tree);
  if (!allow) {
    const labels = flattenLabels(tree).map((l) => l.toLowerCase());
    const hasAllowCopy = labels.some((l) =>
      /allow extension|allow in/i.test(l),
    );
    if (!hasAllowCopy) {
      throw new Error(
        `Allow Extension surface missing after opening appex detail; labels=${flattenLabels(tree).slice(0, 40).join("|")}`,
      );
    }
    throw new Error(
      `Allow Extension control missing despite copy; labels=${flattenLabels(tree).slice(0, 40).join("|")}`,
    );
  }

  if (isAllowOn(allow.value)) {
    steps.push("appex-allow-already-on");
    return;
  }
  if (!allow.frame) {
    throw new Error("Allow Extension control has no frame");
  }
  if (!isAllowOff(allow.value)) {
    throw new Error(
      `Allow Extension unexpected value=${JSON.stringify(allow.value)}`,
    );
  }

  let how = "none";
  for (const fraction of ALLOW_TAP_FRACTIONS) {
    if (!allow?.frame) break;
    await tapAllowExtensionMidRight(device, allow.frame, fraction);
    how = `mid-right:${fraction}`;
    await sleep(450);
    tree = await device.accessibilityTree();
    allow = findAllowExtensionControl(tree);
    if (allow && isAllowOn(allow.value)) break;
  }
  if (!allow || !isAllowOn(allow.value)) {
    throw new Error(
      `Allow Extension still off after tap (${how}); value=${JSON.stringify(allow?.value)} type=${allow?.type}`,
    );
  }
  steps.push(`appex-allow-toggled-on:${how}`);
}

/**
 * In Safari on example.com: Page Menu → extension row → popup chrome.
 * Proves the appex UI actually opens (not just content-script side effects).
 */
export async function openSafariExtensionPopup(
  device: DeviceSession,
  appexLabels: string[],
  steps: string[],
): Promise<void> {
  // Dismiss one-time Highlights coaching if present.
  await tapLabelInTree(device, ["Not Now"], { exactOnly: true });
  await sleep(300);

  let openedMenu = false;
  try {
    await device.getById("PageFormatMenuButton", { timeoutMs: 3_000 }).tap();
    openedMenu = true;
    steps.push("safari-page-menu:id");
  } catch {
    openedMenu = await tapLabelInTree(device, ["Page Menu"]);
    if (openedMenu) steps.push("safari-page-menu:label");
  }
  if (!openedMenu) {
    throw new Error("Safari Page Menu not found");
  }
  await sleep(700);

  // Prefer exact extension display name; try each matching row (RN + native
  // both show as “ET Safari Target” on the Page Menu).
  const names = [
    ...appexLabels,
    ...appexLabels.map((l) => l.replace(/ Target$/i, "")),
  ].filter(Boolean);
  const want = names.map((n) => n.toLowerCase());
  const menuTree = await device.accessibilityTree();
  const rows = menuTree.filter((n) => {
    const label = (n.label ?? "").trim().toLowerCase();
    if (!label || !n.frame || n.frame.width < 8) return false;
    return want.some((w) => label === w || label.includes(w));
  });
  if (!rows.length) {
    throw new Error(
      `Safari Page Menu: extension row missing ${JSON.stringify(names)}; labels=${flattenLabels(menuTree).slice(0, 50).join("|")}`,
    );
  }

  let popupOk = false;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]!;
    const f = row.frame!;
    await device.tap({
      x: Math.round(f.x + f.width / 2),
      y: Math.round(f.y + f.height / 2),
    });
    steps.push(`safari-extension-row-tapped:${r}`);
    await sleep(1_000);

    for (let i = 0; i < 8; i++) {
      const tree = await device.accessibilityTree();
      const labels = flattenLabels(tree);
      const hasHeading = labels.some((l) =>
        appexLabels.some((a) => l.toLowerCase().includes(a.toLowerCase())),
      );
      const hasDone = labels.some((l) => /^done$/i.test(l.trim()));
      if (hasHeading && hasDone) {
        popupOk = true;
        break;
      }
      await sleep(300);
    }
    if (popupOk) break;

    // Re-open Page Menu for the next candidate row.
    try {
      await device.getById("PageFormatMenuButton", { timeoutMs: 2_000 }).tap();
    } catch {
      await tapLabelInTree(device, ["Page Menu"]);
    }
    await sleep(600);
    await tapLabelInTree(device, ["Not Now"], { exactOnly: true });
  }

  if (!popupOk) {
    const tree = await device.accessibilityTree();
    throw new Error(
      `Safari extension popup did not open; labels=${flattenLabels(tree).slice(0, 40).join("|")}`,
    );
  }
  steps.push("safari-extension-popup-ok");

  // Close popup so later host asserts are clean.
  await tapLabelInTree(device, ["Done"], { exactOnly: true });
  await sleep(400);
  steps.push("safari-extension-popup-dismissed");
}

/**
 * On an appex detail page, set a website permission row to Allow
 * (e.g. “example.com, Ask” → Allow). Soft-ok if the row is already Allow.
 */
export async function allowAppexOnWebsite(
  device: DeviceSession,
  hostname: string,
  steps: string[],
): Promise<void> {
  const host = hostname.toLowerCase();
  const tree = await device.accessibilityTree();
  const allLabels = flattenLabels(tree).map((l) => l.toLowerCase());
  if (
    allLabels.some(
      (l) => l.includes(host) && l.includes("allow") && !l.includes("ask"),
    )
  ) {
    steps.push(`website-perm-already-allow:${hostname}`);
    return;
  }

  const row =
    tree.find((n) => {
      const label = (n.label ?? "").toLowerCase();
      return (
        label.includes(host) &&
        (label.includes("ask") || label.includes("deny") || label.includes(","))
      );
    }) ??
    tree.find((n) => (n.label ?? "").toLowerCase().includes(host));
  if (!row) {
    steps.push(`website-perm-row-missing:${hostname}`);
    return;
  }

  if (row.frame) {
    await device.tap({
      x: Math.round(row.frame.x + row.frame.width / 2),
      y: Math.round(row.frame.y + row.frame.height / 2),
    });
    await sleep(500);
    steps.push(`website-perm-open:${hostname}`);
  }

  // Re-check — tapping an already-Allow row can be a no-op sheet.
  const after = flattenLabels(await device.accessibilityTree()).map((l) =>
    l.toLowerCase(),
  );
  if (
    after.some(
      (l) => l.includes(host) && l.includes("allow") && !l.includes("ask"),
    )
  ) {
    steps.push(`website-perm-already-allow:${hostname}`);
    return;
  }

  const allowed = await tapLabelInTree(device, ["Allow"], { exactOnly: true });
  if (!allowed) {
    const alt = await tapLabelInTree(device, [
      "Always Allow",
      "Allow on Every Website",
      "Allow for One Day",
    ]);
    if (!alt) {
      throw new Error(
        `Could not set ${hostname} permission to Allow; labels=${flattenLabels(await device.accessibilityTree()).slice(0, 40).join("|")}`,
      );
    }
    steps.push(`website-perm-allowed-alt:${hostname}`);
  } else {
    steps.push(`website-perm-allowed:${hostname}`);
  }
  await sleep(400);
}
