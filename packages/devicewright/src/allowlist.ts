/**
 * Argument allowlists — paths and bundle IDs from agents must be validated
 * before use. Never interpolate into shells.
 */

import fs from 'node:fs';
import path from 'node:path';

const BUNDLE_ID_RE = /^[A-Za-z][A-Za-z0-9_-]*(\.[A-Za-z0-9_-]+)+$/;
const UDID_RE = /^[0-9A-Fa-f-]{8,}$/;
const DEVICE_NAME_RE = /^[A-Za-z0-9 ._+()-]{1,64}$/;

export function assertSafeBundleId(bundleId: string): string {
  const trimmed = bundleId.trim();
  if (!BUNDLE_ID_RE.test(trimmed)) {
    throw new Error(`invalid bundle id: ${bundleId}`);
  }
  return trimmed;
}

export function assertSafeDeviceId(deviceId: string): string {
  const trimmed = deviceId.trim();
  if (!(UDID_RE.test(trimmed) || DEVICE_NAME_RE.test(trimmed))) {
    throw new Error(`invalid device id: ${deviceId}`);
  }
  return trimmed;
}

export function assertSafePath(
  inputPath: string,
  options: { mustExist?: boolean; allowRelative?: boolean } = {}
): string {
  const { mustExist = false, allowRelative = true } = options;
  if (inputPath.includes('\0')) {
    throw new Error('path contains null byte');
  }
  if (/[\n\r;|&`$]/.test(inputPath)) {
    throw new Error(`path contains unsafe characters: ${inputPath}`);
  }
  const resolved = path.resolve(inputPath);
  if (!allowRelative && inputPath !== resolved && !path.isAbsolute(inputPath)) {
    throw new Error(`relative paths not allowed: ${inputPath}`);
  }
  if (mustExist && !fs.existsSync(resolved)) {
    throw new Error(`path does not exist: ${resolved}`);
  }
  return resolved;
}

export function assertSafeOutputPath(inputPath: string): string {
  return assertSafePath(inputPath, { mustExist: false, allowRelative: true });
}
