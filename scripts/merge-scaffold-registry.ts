#!/usr/bin/env bun
/** Merge scaffolded required-rows + claims into devicewright sources. */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");
const rows = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, "scripts/generated/required-rows.json"),
    "utf8",
  ),
) as { id: string; path: string; phase: number }[];
const claims = JSON.parse(
  fs.readFileSync(path.join(ROOT, "scripts/generated/claims.json"), "utf8"),
) as { id: string; reason: string }[];

const phase4 = rows.filter((r) => r.phase === 4);
const phase5 = rows.filter((r) => r.phase === 5);

function fmtRows(list: typeof rows): string {
  return list
    .map((r) => `  { id: '${r.id}', path: '${r.path}', phase: ${r.phase} },`)
    .join("\n");
}

const requiredPath = path.join(ROOT, "examples/.devicewright/required.ts");
let required = fs.readFileSync(requiredPath, "utf8");
required = required.replace(
  /export const REQUIRED_V2_PHASE4: readonly RequiredTargetRow\[\] = \[\] as const;/,
  `export const REQUIRED_V2_PHASE4: readonly RequiredTargetRow[] = [\n${fmtRows(phase4)}\n] as const;`,
);
required = required.replace(
  /export const REQUIRED_V2_PHASE5: readonly RequiredTargetRow\[\] = \[\] as const;/,
  `export const REQUIRED_V2_PHASE5: readonly RequiredTargetRow[] = [\n${fmtRows(phase5)}\n] as const;`,
);
fs.writeFileSync(requiredPath, required);

const claimsPath = path.join(ROOT, "examples/.devicewright/claims.ts");
const claimsBody = claims
  .map((c) => `  { id: '${c.id}', reason: ${JSON.stringify(c.reason)} },`)
  .join("\n");
fs.writeFileSync(
  claimsPath,
  `/**
 * Frozen os-limit CLAIMS allowlist.
 * Unknown \`os-limit\` results fail the local/operator matrix runner.
 * New rows land only in the same tranche PR as the type (grill ownership A).
 */

export type ClaimsEntry = {
  /** REQUIRED matrix id (or type key when 1:1). */
  id: string;
  /** Why deeper OS automation is blocked. */
  reason: string;
  /** Optional operator notes. */
  notes?: string;
};

export const OS_LIMIT_CLAIMS: readonly ClaimsEntry[] = [
${claimsBody}
] as const;

const BY_ID = new Map(OS_LIMIT_CLAIMS.map((c) => [c.id, c]));

export function claimForId(id: string): ClaimsEntry | undefined {
  return BY_ID.get(id);
}

export function assertOsLimitAllowed(id: string): void {
  if (!BY_ID.has(id)) {
    throw new Error(
      \`os-limit claim for "\${id}" is not in OS_LIMIT_CLAIMS — add it in the same PR as the type (examples/.devicewright/claims.ts)\`,
    );
  }
}
`,
);

// Append catalog entries
const catalogPath = path.join(ROOT, "examples/.devicewright/catalog.ts");
let catalog = fs.readFileSync(catalogPath, "utf8");
if (!catalog.includes("'notification-service'")) {
  const extras = rows
    .map((r) => {
      const hostBundleId = r.path.includes("/native/")
        ? `com.expotargets.example.native.${r.id.replace(/^native-/, "")}`
        : `com.expotargets.example.${r.id}`;
      // Fix native paths: examples/native/foo → com.expotargets.example.native.foo
      let bid = hostBundleId;
      if (r.path.startsWith("examples/native/")) {
        const leaf = r.path.replace("examples/native/", "");
        bid = `com.expotargets.example.native.${leaf}`;
      } else if (r.path.startsWith("examples/")) {
        bid = `com.expotargets.example.${r.path.replace("examples/", "")}`;
      }
      return `  '${r.id}': {
    id: '${r.id}',
    path: '${r.path}',
    hostBundleId: '${bid}',
    hostDisplayName: 'ET ${r.id}',
    extensionName: 'ET ${r.id}',
    extensionAliases: ['${r.id}'],
    payloadMarker: 'ready',
    completeButton: '',
    testIds: {
      screenRoot: 'screen-root',
      clearPayload: 'btn-clear-payload',
      lastPayload: 'text-last-payload',
    },
  },`;
    })
    .join("\n");
  catalog = catalog.replace(/\n\};\n?\s*$/, `\n${extras}\n};\n`);
  fs.writeFileSync(catalogPath, catalog);
}

console.log({
  phase4: phase4.length,
  phase5: phase5.length,
  claims: claims.length,
});
