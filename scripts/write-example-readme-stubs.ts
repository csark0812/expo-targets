/**
 * One-shot: thin README stubs for REQUIRED_V2 (+ kitchen-sink) example hosts.
 * Run: bun scripts/write-example-readme-stubs.ts
 */
import fs from "node:fs";
import path from "node:path";
import {
  OPTIONAL_KITCHEN_SINK,
  REQUIRED_V2,
} from "../examples/.devicewright/required.ts";

const rows = [...REQUIRED_V2, OPTIONAL_KITCHEN_SINK];
const byPath = new Map<string, { id: string; path: string }>();
for (const r of rows) {
  if (!byPath.has(r.path)) byPath.set(r.path, r);
}

function titleFromPath(p: string): string {
  const base = p.replace(/^examples\//, "");
  return base
    .split("/")
    .map((s) =>
      s
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
    )
    .join(" / ");
}

function configTypeHint(id: string, p: string): string {
  if (id === "live-activity" || p.endsWith("/trick")) {
    return "widget (+ Live Activity)";
  }
  if (id === "kitchen-sink") return "multi-type (see host config)";
  if (id.startsWith("native-")) return id.replace(/^native-/, "");
  if (id === "wallet-ui") return "wallet (ui)";
  if (id === "intent-ui") return "intent (ui)";
  return id;
}

function relLinks(p: string): { ups: string; docs: string } {
  if (p.startsWith("examples/native/")) {
    return { ups: "../..", docs: "../../../docs" };
  }
  return { ups: "..", docs: "../../docs" };
}

let written = 0;
for (const [p, row] of [...byPath.entries()].sort()) {
  const abs = path.join(process.cwd(), p);
  if (!fs.existsSync(path.join(abs, "package.json"))) {
    console.warn("skip missing package", p);
    continue;
  }
  const { ups, docs } = relLinks(p);
  const title = titleFromPath(p);
  const typeHint = configTypeHint(row.id, p);
  const body = `# ${title}

Thin expo-targets example host for \`${typeHint}\`.

Suite how-to (install, Devicewright, icons): [${ups}/README.md](${ups}/README.md).

Type / maturity SSOT: [${docs}/configuration.md](${docs}/configuration.md).

\`\`\`bash
# From repo root
bun install
cd ${p}
npx expo prebuild --platform ios
npx expo run:ios
\`\`\`

Devicewright (operator, after Release install on a booted sim):

\`\`\`bash
bun run examples:devicewright:matrix --ids=${row.id}
\`\`\`

Do not commit generated \`ios/\` / \`android/\`. Never edit \`ExpoTargetsGenerated/\`.
`;
  fs.writeFileSync(path.join(abs, "README.md"), body);
  written++;
}
console.log("wrote", written, "stubs");
