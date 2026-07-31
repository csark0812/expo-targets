/**
 * Simulator helpers — delegates boot/list to Devicewright.
 */

import process from 'node:process';

import { iosSimctl } from '@expo-targets/devicewright';

import { DEFAULT_SIM_UDID } from './constants';

export function resolveSimUdid(): string {
  const fromEnv = process.env.UITEST_SIM_UDID?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_SIM_UDID;
}

export function assertSimulatorExists(udid: string): void {
  iosSimctl.assertSimulatorExists(udid);
}

export function bootSimulator(udid: string): void {
  iosSimctl.bootSimulator(udid);
}
