/**
 * MCP iOS session registry — Map-by-UDID, per-device mutex, out-of-band force-close.
 * Soft-omit lives here only (do not import from CLI / shared resolveSimulatorId).
 */

import type { ChildProcess } from 'node:child_process';

import { assertSafeDeviceId } from '../allowlist';
import { devices } from '../devices';
import { setIdbChildTracker } from '../ios/idb';
import { listSimulators, type SimDevice } from '../ios/simctl';
import type { DeviceSession } from '../session';

export const DEVICE_CLOSE_FORCED = 'DEVICE_CLOSE_FORCED';
export const DEVICE_SESSION_ABORTED = 'DEVICE_SESSION_ABORTED';

export type CloseDeviceResult =
  | { ok: true; forced: false; udid: string }
  | {
      ok: false;
      forced: true;
      code: typeof DEVICE_CLOSE_FORCED;
      udid: string;
      drainMs: number;
      message: string;
    };

export type BootedSimRow = {
  udid: string;
  name: string;
  heldByThisMcp: boolean;
};

function abortedError(udid: string): Error {
  const err = new Error(
    `${DEVICE_SESSION_ABORTED}: device session ${udid} was aborted (closing or force-closed)`
  );
  err.name = DEVICE_SESSION_ABORTED;
  return err;
}

/** MCP-only soft-omit: 0 → error; 1 → that udid; many → error with list. */
export function resolveMcpSimulatorIdFromBooted(
  deviceId: string | undefined,
  booted: Array<{ udid: string; name: string }>
): string {
  if (deviceId) return assertSafeDeviceId(deviceId);
  if (booted.length === 0) {
    throw new Error(
      'no booted simulator; boot one or pass udid. Use list_booted_sims.'
    );
  }
  if (booted.length === 1) return booted[0]!.udid;
  const list = booted.map((d) => `${d.name} (${d.udid})`).join(', ');
  throw new Error(
    `multiple booted simulators; pass udid. Booted: ${list}. Use list_booted_sims.`
  );
}

export function resolveMcpSimulatorId(deviceId?: string): string {
  if (deviceId) return assertSafeDeviceId(deviceId);
  return resolveMcpSimulatorIdFromBooted(undefined, listBootedSimulators());
}

/** Discovery-only soft-omit (no launch / lock / registry). */
export function discoverBootedSimId(): string {
  return resolveMcpSimulatorId();
}

export function listBootedSimulators(): SimDevice[] {
  return listSimulators().filter((d) => d.state === 'Booted');
}

export type SessionRegistryDeps = {
  /** Override iOS launch (tests). Default: devices.launch lock:true. */
  launchIos?: (deviceId: string) => Promise<DeviceSession>;
  /** Override soft-omit resolve (tests). */
  resolveId?: (deviceId?: string) => string;
  /** Override booted list for listBootedWithHeld (tests). */
  listBooted?: () => Array<{ udid: string; name: string }>;
  /** Skip installing global idb child tracker (tests with multiple registries). */
  skipIdbTracker?: boolean;
};

export class SessionRegistry {
  private readonly sessions = new Map<string, DeviceSession>();
  private readonly inFlight = new Map<string, Promise<DeviceSession>>();
  private readonly queues = new Map<string, Promise<void>>();
  private readonly closing = new Set<string>();
  private readonly children = new Map<string, Set<ChildProcess>>();
  private readonly busyCount = new Map<string, number>();
  private readonly idleWaiters = new Map<string, Array<() => void>>();
  private readonly abortControllers = new Map<string, AbortController>();
  private readonly exclusiveAborts = new Map<string, Array<() => void>>();
  private readonly deps: SessionRegistryDeps;

  constructor(deps: SessionRegistryDeps = {}) {
    this.deps = deps;
    if (!deps.skipIdbTracker) {
      setIdbChildTracker((udid, child) => this.trackChild(udid, child));
    }
  }

  isHeld(udid: string): boolean {
    return this.sessions.has(udid);
  }

  heldIds(): string[] {
    return [...this.sessions.keys()];
  }

  listBootedWithHeld(): BootedSimRow[] {
    const booted = this.deps.listBooted
      ? this.deps.listBooted()
      : listBootedSimulators();
    return booted.map((d) => ({
      udid: d.udid,
      name: d.name,
      heldByThisMcp: this.sessions.has(d.udid),
    }));
  }

  async ensureDevice(deviceId?: string): Promise<DeviceSession> {
    const id = this.deps.resolveId
      ? this.deps.resolveId(deviceId)
      : resolveMcpSimulatorId(deviceId);
    if (this.closing.has(id)) {
      throw abortedError(id);
    }
    const existing = this.sessions.get(id);
    if (existing) return existing;

    const pending = this.inFlight.get(id);
    if (pending) return pending;

    const launch = (async () => {
      try {
        const session = this.deps.launchIos
          ? await this.deps.launchIos(id)
          : await devices.launch({
              platform: 'ios',
              deviceId: id,
              lock: true,
              boot: true,
            });
        this.sessions.set(id, session);
        return session;
      } finally {
        this.inFlight.delete(id);
      }
    })();

    this.inFlight.set(id, launch);
    return launch;
  }

  /**
   * Serialize tool bodies per UDID. Cross-UDID work overlaps.
   * Rejects immediately if the device is closing.
   */
  async runExclusive<T>(
    deviceId: string,
    fn: (session: DeviceSession) => Promise<T>
  ): Promise<T> {
    const id = assertSafeDeviceId(deviceId);
    if (this.closing.has(id)) {
      throw abortedError(id);
    }

    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const prev = this.queues.get(id) ?? Promise.resolve();
    this.queues.set(
      id,
      prev.then(() => gate).catch(() => gate)
    );

    await prev.catch(() => undefined);

    if (this.closing.has(id)) {
      release();
      throw abortedError(id);
    }

    this.bumpBusy(id, 1);
    const ac = this.abortControllers.get(id) ?? new AbortController();
    this.abortControllers.set(id, ac);

    let abortExclusive!: () => void;
    const abortPromise = new Promise<never>((_, reject) => {
      abortExclusive = () => reject(abortedError(id));
    });
    const aborts = this.exclusiveAborts.get(id) ?? [];
    aborts.push(abortExclusive);
    this.exclusiveAborts.set(id, aborts);

    try {
      const session = this.sessions.get(id) ?? (await this.ensureDevice(id));
      return await Promise.race([fn(session), abortPromise]);
    } catch (e) {
      if (this.closing.has(id) || ac.signal.aborted) {
        throw abortedError(id);
      }
      throw e;
    } finally {
      const list = this.exclusiveAborts.get(id);
      if (list) {
        const idx = list.indexOf(abortExclusive);
        if (idx >= 0) list.splice(idx, 1);
        if (list.length === 0) this.exclusiveAborts.delete(id);
      }
      this.bumpBusy(id, -1);
      release();
    }
  }

  async closeDevice(
    deviceId: string,
    drainMs = 30_000
  ): Promise<CloseDeviceResult> {
    const udid = assertSafeDeviceId(deviceId);
    this.closing.add(udid);

    // Reject new exclusive work; race idle vs timeout (out-of-band — not queued behind holder).
    const forced = await this.waitIdleOrTimeout(udid, drainMs);

    this.killChildren(udid);
    this.abortControllers.get(udid)?.abort();
    this.abortControllers.delete(udid);
    this.poisonExclusive(udid);

    const session = this.sessions.get(udid);
    this.sessions.delete(udid);
    this.inFlight.delete(udid);
    this.queues.delete(udid);
    this.busyCount.delete(udid);
    this.wakeIdleWaiters(udid);

    try {
      await session?.close();
    } catch {
      // best-effort unlock
    }

    this.closing.delete(udid);

    if (forced) {
      return {
        ok: false,
        forced: true,
        code: DEVICE_CLOSE_FORCED,
        udid,
        drainMs,
        message: `force-closed ${udid} after ${drainMs}ms drain; in-flight work aborted`,
      };
    }
    return { ok: true, forced: false, udid };
  }

  /** Best-effort unlock for this MCP process only — no drain. */
  async releaseAll(): Promise<void> {
    const ids = [...this.sessions.keys(), ...this.inFlight.keys()];
    for (const id of new Set(ids)) {
      this.closing.add(id);
      this.killChildren(id);
      this.abortControllers.get(id)?.abort();
      this.abortControllers.delete(id);
      this.poisonExclusive(id);
    }
    const sessions = [...this.sessions.values()];
    this.sessions.clear();
    this.inFlight.clear();
    this.queues.clear();
    this.busyCount.clear();
    this.children.clear();
    for (const id of ids) this.wakeIdleWaiters(id);
    await Promise.all(
      sessions.map(async (s) => {
        try {
          await s.close();
        } catch {
          // ignore
        }
      })
    );
    this.closing.clear();
  }

  private poisonExclusive(udid: string): void {
    const aborts = this.exclusiveAborts.get(udid);
    if (!aborts?.length) return;
    this.exclusiveAborts.delete(udid);
    for (const abort of aborts) {
      try {
        abort();
      } catch {
        // ignore
      }
    }
  }

  private trackChild(udid: string, child: ChildProcess): void {
    let set = this.children.get(udid);
    if (!set) {
      set = new Set();
      this.children.set(udid, set);
    }
    set.add(child);
    const cleanup = () => set!.delete(child);
    child.once('close', cleanup);
    child.once('error', cleanup);
  }

  private killChildren(udid: string): void {
    const set = this.children.get(udid);
    if (!set) return;
    for (const child of set) {
      try {
        child.kill('SIGKILL');
      } catch {
        // ignore
      }
    }
    set.clear();
    this.children.delete(udid);
  }

  private bumpBusy(udid: string, delta: number): void {
    const next = (this.busyCount.get(udid) ?? 0) + delta;
    if (next <= 0) {
      this.busyCount.delete(udid);
      this.wakeIdleWaiters(udid);
    } else {
      this.busyCount.set(udid, next);
    }
  }

  private wakeIdleWaiters(udid: string): void {
    const waiters = this.idleWaiters.get(udid);
    if (!waiters?.length) return;
    this.idleWaiters.delete(udid);
    for (const w of waiters) w();
  }

  private waitUntilIdle(udid: string): Promise<void> {
    if ((this.busyCount.get(udid) ?? 0) === 0) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const list = this.idleWaiters.get(udid) ?? [];
      list.push(resolve);
      this.idleWaiters.set(udid, list);
    });
  }

  private async waitIdleOrTimeout(
    udid: string,
    drainMs: number
  ): Promise<boolean> {
    const winner = await Promise.race([
      this.waitUntilIdle(udid).then(() => 'idle' as const),
      new Promise<'timeout'>((resolve) => {
        setTimeout(() => resolve('timeout'), drainMs);
      }),
    ]);
    return winner === 'timeout' && (this.busyCount.get(udid) ?? 0) > 0;
  }
}

export function createSessionRegistry(
  deps: SessionRegistryDeps = {}
): SessionRegistry {
  return new SessionRegistry(deps);
}
