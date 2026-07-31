import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { applyCuts, HOST_CLAIMS, type HostId, mustKeepHosts } from '../claims';
import { devices } from '../devices';
import { type HostJourneyResult, recipeFor } from '../hosts';
import type { Platform } from '../types';

export type RunMatrixOptions = {
  hosts?: HostId[];
  iosDevice?: string;
  androidDevice?: string;
  artifactDir?: string;
  rounds?: number;
};

export type MatrixResult = {
  results: HostJourneyResult[];
  surviving: HostId[];
  cut: HostId[];
  artifactDir: string;
};

function platformForHost(host: HostId): Platform {
  return host === 'android-hello' ? 'android' : 'ios';
}

async function runOneHost(options: {
  host: HostId;
  round: number;
  iosDevice?: string;
  androidDevice?: string;
  artifactDir: string;
}): Promise<HostJourneyResult> {
  const recipe = recipeFor(options.host);
  if (!recipe) {
    return {
      host: options.host,
      ok: false,
      steps: [],
      error: `no recipe for ${options.host}`,
    };
  }

  const platform = platformForHost(options.host);
  let device;
  try {
    device = await devices.launch({
      platform,
      device: platform === 'ios' ? options.iosDevice : options.androidDevice,
      lock: true,
      boot: platform === 'ios',
    });
  } catch (e) {
    return {
      host: options.host,
      ok: false,
      steps: [],
      error: `launch failed: ${e}`,
    };
  }

  try {
    const result = await recipe.run(device);
    fs.writeFileSync(
      path.join(
        options.artifactDir,
        `${options.host}-round${options.round}.trace.json`
      ),
      JSON.stringify({ result, trace: device.getTrace() }, null, 2)
    );
    return result;
  } finally {
    await device.close();
  }
}

function tallyGreen(
  hosts: HostId[],
  results: HostJourneyResult[],
  rounds: number
): Set<HostId> {
  const counts = new Map<HostId, number>();
  for (const r of results) {
    if (r.ok) counts.set(r.host, (counts.get(r.host) ?? 0) + 1);
  }
  const green = new Set<HostId>();
  for (const host of hosts) {
    if ((counts.get(host) ?? 0) >= rounds) green.add(host);
  }
  return green;
}

export async function runHostMatrix(
  options: RunMatrixOptions = {}
): Promise<MatrixResult> {
  const hosts = options.hosts ?? HOST_CLAIMS.map((h) => h.id);
  const rounds = options.rounds ?? 2;
  const artifactDir =
    options.artifactDir ??
    path.join(process.cwd(), 'devicewright-artifacts', String(Date.now()));
  fs.mkdirSync(artifactDir, { recursive: true });

  const allResults: HostJourneyResult[] = [];
  for (let round = 1; round <= rounds; round++) {
    for (const host of hosts) {
      allResults.push(
        await runOneHost({
          host,
          round,
          iosDevice: options.iosDevice,
          androidDevice: options.androidDevice,
          artifactDir,
        })
      );
    }
  }

  const green = tallyGreen(hosts, allResults, rounds);
  const claim = applyCuts(green);
  fs.writeFileSync(
    path.join(artifactDir, 'claim-state.json'),
    JSON.stringify({ ...claim, mustKeep: mustKeepHosts() }, null, 2)
  );

  return {
    results: allResults,
    surviving: claim.surviving,
    cut: claim.cut,
    artifactDir,
  };
}

export type TestFixtures = {
  iosDevice?: string;
  androidDevice?: string;
  artifactDir?: string;
};

export function createDeviceFixtures(defaults: TestFixtures = {}) {
  return {
    async withIos<T>(
      fn: (device: Awaited<ReturnType<typeof devices.launch>>) => Promise<T>
    ): Promise<T> {
      const device = await devices.launch({
        platform: 'ios',
        device: defaults.iosDevice,
        lock: true,
        boot: true,
      });
      try {
        return await fn(device);
      } finally {
        await device.close();
      }
    },
    async withAndroid<T>(
      fn: (device: Awaited<ReturnType<typeof devices.launch>>) => Promise<T>
    ): Promise<T> {
      const device = await devices.launch({
        platform: 'android',
        device: defaults.androidDevice,
        lock: true,
      });
      try {
        return await fn(device);
      } finally {
        await device.close();
      }
    },
  };
}
