import fs from 'node:fs';
import path from 'node:path';
import {
  type DoctorReport,
  formatDoctor,
  runDoctor,
} from '@csark0812/devicewright';
import { simctl } from '@csark0812/devicewright/ios';
import { REQUIRED_V1 } from './required';
import { exampleExists, repoRoot } from './root';

export type DoctorCheck = { name: string; ok: boolean; detail: string };

export type DryPreflightReport = {
  ok: boolean;
  checks: DoctorCheck[];
  repoRoot: string;
  doctor: DoctorReport;
};

function checkRequiredPaths(): DoctorCheck {
  const missing: string[] = [];
  for (const row of REQUIRED_V1) {
    if (!exampleExists(row.path)) missing.push(row.path);
  }
  return {
    name: 'REQUIRED_V1_paths',
    ok: missing.length === 0,
    detail:
      missing.length === 0
        ? `${REQUIRED_V1.length} paths present`
        : `missing: ${missing.join(', ')}`,
  };
}

function checkBootedSim(): DoctorCheck {
  try {
    const sims = simctl.listSimulators();
    const booted = sims.filter((s) => s.state === 'Booted');
    return {
      name: 'booted_sim',
      ok: booted.length > 0,
      detail:
        booted.length > 0
          ? `${booted.length} booted (${booted.map((s) => s.name).join(', ')})`
          : 'no Booted simulator — boot one before matrix',
    };
  } catch (e) {
    return { name: 'booted_sim', ok: false, detail: String(e) };
  }
}

function checkReadmeReleaseRecipes(): DoctorCheck {
  const readmePath = path.join(__dirname, 'README.md');
  let text = '';
  try {
    text = fs.readFileSync(readmePath, 'utf8');
  } catch (e) {
    return {
      name: 'readme_release_recipes',
      ok: false,
      detail: `cannot read ${readmePath}: ${e}`,
    };
  }
  const needles = [
    'Release',
    'dry-preflight',
    'examples:devicewright',
    'matrix',
  ];
  const missing = needles.filter((n) => !text.includes(n));
  return {
    name: 'readme_release_recipes',
    ok: missing.length === 0,
    detail:
      missing.length === 0
        ? 'suite README documents Release / dry-preflight / examples:devicewright / matrix'
        : `README missing: ${missing.join(', ')}`,
  };
}

export function runDryPreflight(
  options: {
    allowNoSim?: boolean;
    requireAndroid?: boolean;
    idbPath?: string;
  } = {}
): DryPreflightReport {
  const root = repoRoot();
  const pathCheck = checkRequiredPaths();
  const readmeCheck = checkReadmeReleaseRecipes();
  const doctor = runDoctor({
    idbPath: options.idbPath,
    requireAndroid: options.requireAndroid === true,
  });
  const simCheck = checkBootedSim();
  if (options.allowNoSim && !simCheck.ok) {
    simCheck.ok = true;
    simCheck.detail = `${simCheck.detail} (allowed via allowNoSim)`;
  }

  const checks: DoctorCheck[] = [
    {
      name: 'repo_root',
      ok: fs.existsSync(root),
      detail: root,
    },
    pathCheck,
    ...doctor.checks,
    simCheck,
    readmeCheck,
  ];

  return {
    ok: checks.every((c) => c.ok),
    checks,
    repoRoot: root,
    doctor,
  };
}

export function formatDryPreflight(report: DryPreflightReport): string {
  const lines = report.checks.map(
    (c) => `${c.ok ? 'PASS' : 'FAIL'}  ${c.name}: ${c.detail}`
  );
  lines.push(report.ok ? '\nDry-preflight OK' : '\nDry-preflight FAILED');
  return lines.join('\n');
}

export { formatDoctor };
