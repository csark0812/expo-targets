import type { DeviceSession } from '../../../.agent-device/driver';
import { runShareActionJourney } from '../../../.agent-device/journeys/share';

export const exampleId = 'native-action' as const;

export function runJourney(device: DeviceSession) {
  return runShareActionJourney(device, 'native-action');
}
