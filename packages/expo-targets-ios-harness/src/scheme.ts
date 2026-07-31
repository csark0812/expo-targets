import fs from 'node:fs';
import path from 'node:path';

import { type UitestEnvKey } from './constants';

export type SchemeTestable = {
  blueprintId: string;
  blueprintName: string;
  buildableName: string;
};

function attr(xml: string, name: string): string | null {
  const match = xml.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`));
  return match?.[1] ?? null;
}

function upsertAttr(attrs: string, name: string, value: string): string {
  const re = new RegExp(`\\b${name}\\s*=\\s*"[^"]*"`);
  if (re.test(attrs)) {
    return attrs.replace(re, `${name} = "${value}"`);
  }
  return `${attrs}\n      ${name} = "${value}"`;
}

function patchActionOpenTag(
  xml: string,
  actionTag: string,
  patchAttrs: (attrs: string) => string
): string {
  const re = new RegExp(`<${actionTag}\\b([^>]*)>`);
  const match = xml.match(re);
  if (!match) {
    return xml;
  }
  const attrs = patchAttrs(match[1] ?? '');
  return xml.replace(match[0], `<${actionTag}${attrs}>`);
}

function setActionBuildConfiguration(
  xml: string,
  actionTag: 'TestAction' | 'LaunchAction',
  configuration: string
): string {
  return patchActionOpenTag(xml, actionTag, (attrs) =>
    upsertAttr(attrs, 'buildConfiguration', configuration)
  );
}

function setShouldUseLaunchSchemeArgsEnv(
  xml: string,
  value: 'YES' | 'NO'
): string {
  return patchActionOpenTag(xml, 'TestAction', (attrs) =>
    upsertAttr(attrs, 'shouldUseLaunchSchemeArgsEnv', value)
  );
}

function parseTestables(xml: string): SchemeTestable[] {
  const block = xml.match(/<Testables>([\s\S]*?)<\/Testables>/)?.[1] ?? '';
  const refs = [...block.matchAll(/<BuildableReference\b([^>]*)\/?\s*>/g)];
  return refs.map((m) => {
    const attrs = m[1];
    return {
      blueprintId: attr(attrs, 'BlueprintIdentifier') ?? '',
      blueprintName: attr(attrs, 'BlueprintName') ?? '',
      buildableName: attr(attrs, 'BuildableName') ?? '',
    };
  });
}

function renderTestable(opts: {
  projectFileName: string;
  testable: SchemeTestable;
}): string {
  const { projectFileName, testable } = opts;
  return `         <TestableReference
            skipped = "NO">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "${testable.blueprintId}"
               BuildableName = "${testable.buildableName}"
               BlueprintName = "${testable.blueprintName}"
               ReferencedContainer = "container:${projectFileName}">
            </BuildableReference>
         </TestableReference>`;
}

function renderEnvVars(env: Partial<Record<UitestEnvKey, string>>): string {
  const entries = Object.entries(env).filter(
    ([, value]) => value !== undefined && value !== ''
  );
  if (entries.length === 0) {
    return '';
  }
  const body = entries
    .map(
      ([key, value]) => `         <EnvironmentVariable
            key = "${key}"
            value = "${String(value).replace(/"/g, '&quot;')}"
            isEnabled = "YES">
         </EnvironmentVariable>`
    )
    .join('\n');
  return `      <EnvironmentVariables>
${body}
      </EnvironmentVariables>`;
}

function ensureTestablesSection(xml: string): string {
  if (/<Testables[\s>]/.test(xml)) {
    return xml;
  }
  return xml.replace(
    /(<TestAction\b[^>]*>)/,
    `$1\n      <Testables>\n      </Testables>`
  );
}

function replaceTestables(xml: string, testablesXml: string): string {
  if (/<Testables\b[^>]*\/>/.test(xml)) {
    return xml.replace(
      /<Testables\b[^>]*\/>/,
      `<Testables>\n${testablesXml}\n      </Testables>`
    );
  }
  return xml.replace(
    /<Testables>[\s\S]*?<\/Testables>/,
    `<Testables>\n${testablesXml}\n      </Testables>`
  );
}

function replaceOrInsertEnvVars(xml: string, envXml: string): string {
  if (!envXml) {
    return xml;
  }
  if (
    /<TestAction[\s\S]*?<EnvironmentVariables>[\s\S]*?<\/EnvironmentVariables>/.test(
      xml
    )
  ) {
    return xml.replace(
      /(<TestAction\b[\s\S]*?)(<EnvironmentVariables>[\s\S]*?<\/EnvironmentVariables>)/,
      `$1${envXml}`
    );
  }
  // Insert before closing TestAction.
  return xml.replace(
    /(<\/Testables>\s*)(<\/TestAction>)/,
    `$1${envXml}\n   $2`
  );
}

export function findHostSchemePath(opts: {
  xcodeprojPath: string;
  hostName: string;
}): string {
  const schemesDir = path.join(opts.xcodeprojPath, 'xcshareddata', 'xcschemes');
  if (!fs.existsSync(schemesDir)) {
    throw new Error(`no xcshareddata/xcschemes under ${opts.xcodeprojPath}`);
  }
  const schemes = fs
    .readdirSync(schemesDir)
    .filter((name) => name.endsWith('.xcscheme'))
    .map((name) => path.join(schemesDir, name));
  if (schemes.length === 0) {
    throw new Error(`no shared xcscheme under ${opts.xcodeprojPath}`);
  }
  const preferred = schemes.find(
    (p) => path.basename(p, '.xcscheme') === opts.hostName
  );
  return preferred ?? schemes[0];
}

/**
 * Idempotent scheme wiring for a UITest suite (Release + UITEST_*).
 */
export function updateHostScheme(opts: {
  schemePath: string;
  projectFileName: string;
  knownTargetNames: Set<string>;
  uiTestTargetName: string;
  uiTest: SchemeTestable;
  env: Partial<Record<UitestEnvKey, string>>;
}): { path: string; addedTestable: boolean; removedStale: number } {
  let xml = fs.readFileSync(opts.schemePath, 'utf8');
  xml = ensureTestablesSection(xml);
  xml = setActionBuildConfiguration(xml, 'TestAction', 'Release');
  xml = setActionBuildConfiguration(xml, 'LaunchAction', 'Release');
  xml = setShouldUseLaunchSchemeArgsEnv(xml, 'NO');

  const existing = parseTestables(xml);
  const kept = existing.filter((t) =>
    opts.knownTargetNames.has(t.blueprintName)
  );
  const removedStale = existing.length - kept.length;
  const already = kept.some((t) => t.blueprintName === opts.uiTestTargetName);
  const next = already
    ? kept.map((t) =>
        t.blueprintName === opts.uiTestTargetName ? opts.uiTest : t
      )
    : [...kept, opts.uiTest];

  const testablesXml = next
    .map((testable) =>
      renderTestable({
        projectFileName: opts.projectFileName,
        testable,
      })
    )
    .join('\n');
  xml = replaceTestables(xml, testablesXml);
  xml = replaceOrInsertEnvVars(xml, renderEnvVars(opts.env));
  fs.writeFileSync(opts.schemePath, xml);
  return {
    path: opts.schemePath,
    addedTestable: !already,
    removedStale,
  };
}
