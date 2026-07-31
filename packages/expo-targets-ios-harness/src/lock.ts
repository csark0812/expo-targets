/**
 * Device lock — delegates to @expo-targets/devicewright (Phase 2 cutover).
 * Keeps the historical `{ udid }` handle shape for harness callers.
 */

import {
  acquireDeviceLock,
  type LockHandle as DwLockHandle,
} from '@expo-targets/devicewright';

export type LockHandle = {
  udid: string;
  path: string;
  release: () => void;
};

export function acquireSimLock(udid: string): LockHandle {
  const handle: DwLockHandle = acquireDeviceLock(udid);
  return {
    udid: handle.deviceId,
    path: handle.path,
    release: handle.release,
  };
}
