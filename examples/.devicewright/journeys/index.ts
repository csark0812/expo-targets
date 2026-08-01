import type { DeviceSession } from '@csark0812/devicewright';
import type { RequiredTargetRow } from '../required';
import type { TargetJourneyResult } from '../types';
import { runClipJourney } from './clip';
import { runMessagesJourney } from './messages';
import { runShareActionJourney } from './share';
import { runStickersJourney } from './stickers';
import { runWidgetsJourney } from './widgets';

export {
  C1,
  assertPayloadContains,
  tapId,
  waitForId,
  waitForNamed,
} from './helpers';
export { runClipJourney } from './clip';
export { runMessagesJourney } from './messages';
export { runShareActionJourney } from './share';
export { runStickersJourney } from './stickers';
export { runWidgetsJourney } from './widgets';

export type JourneyRunner = (
  device: DeviceSession
) => Promise<TargetJourneyResult>;

const LIVE: Record<string, JourneyRunner> = {
  share: (d) => runShareActionJourney(d, 'share'),
  action: (d) => runShareActionJourney(d, 'action'),
  'native-share': (d) => runShareActionJourney(d, 'native-share'),
  'native-action': (d) => runShareActionJourney(d, 'native-action'),
  messages: (d) => runMessagesJourney(d, 'A'),
  stickers: (d) => runStickersJourney(d, 'A'),
  clip: (d) => runClipJourney(d),
  widgets: (d) => runWidgetsJourney(d),
};

export function journeyFor(id: string): JourneyRunner | undefined {
  return LIVE[id];
}

export function stubResult(row: RequiredTargetRow): TargetJourneyResult {
  return {
    id: row.id,
    path: row.path,
    phase: row.phase,
    ok: false,
    status: 'stub',
    steps: ['stub'],
    failureKind: 'stub',
    error: `phase ${row.phase} stub — journey not executed in this matrix mode`,
  };
}
