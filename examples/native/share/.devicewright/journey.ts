import type { DeviceSession } from '@csark0812/devicewright';
import { runShareActionJourney } from '../../../.devicewright/journeys/share';

export const exampleId = 'native-share' as const;

export function runJourney(device: DeviceSession) {
  return runShareActionJourney(device, 'native-share');
}
