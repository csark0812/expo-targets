import type { DeviceSession } from '@csark0812/devicewright';
import { runShareActionJourney } from '../../.devicewright/journeys/share';

export const exampleId = 'action' as const;

export function runJourney(device: DeviceSession) {
  return runShareActionJourney(device, 'action');
}
