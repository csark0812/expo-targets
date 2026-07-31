/**
 * Week-7 claim set, cut priority, and host journey registry.
 */

export type HostId =
  | 'share'
  | 'messages'
  | 'stickers'
  | 'photos'
  | 'springboard'
  | 'settings'
  | 'safari'
  | 'wallet'
  | 'clip'
  | 'widgets'
  | 'android-hello';

export type HostClaim = {
  id: HostId;
  platform: 'ios' | 'android' | 'both';
  /** Must remain in week-7 claim if possible. */
  mustKeep: boolean;
  /** Cut order: lower = cut earlier when behind. */
  cutPriority: number;
  description: string;
};

/** Early claimed iOS hosts + Android happy path. */
export const HOST_CLAIMS: HostClaim[] = [
  {
    id: 'share',
    platform: 'ios',
    mustKeep: true,
    cutPriority: 100,
    description: 'Share Sheet',
  },
  {
    id: 'messages',
    platform: 'ios',
    mustKeep: true,
    cutPriority: 100,
    description: 'Messages',
  },
  {
    id: 'photos',
    platform: 'ios',
    mustKeep: true,
    cutPriority: 100,
    description: 'Photos (share source)',
  },
  {
    id: 'springboard',
    platform: 'ios',
    mustKeep: true,
    cutPriority: 100,
    description: 'SpringBoard basics',
  },
  {
    id: 'settings',
    platform: 'ios',
    mustKeep: true,
    cutPriority: 100,
    description: 'Settings',
  },
  {
    id: 'safari',
    platform: 'ios',
    mustKeep: true,
    cutPriority: 100,
    description: 'Safari',
  },
  {
    id: 'stickers',
    platform: 'ios',
    mustKeep: false,
    cutPriority: 40,
    description: 'Stickers',
  },
  {
    id: 'widgets',
    platform: 'ios',
    mustKeep: false,
    cutPriority: 30,
    description: 'Widgets',
  },
  {
    id: 'clip',
    platform: 'ios',
    mustKeep: false,
    cutPriority: 20,
    description: 'App Clip',
  },
  {
    id: 'wallet',
    platform: 'ios',
    mustKeep: false,
    cutPriority: 10,
    description: 'Wallet',
  },
  {
    id: 'android-hello',
    platform: 'android',
    mustKeep: false,
    cutPriority: 50,
    description: 'Android emulator hello-path (launch/assert/screenshot)',
  },
];

/** Cut first if behind: Wallet → App Clip → widgets → Stickers (Android last among optionals). */
export function cutOrder(): HostId[] {
  return [...HOST_CLAIMS]
    .filter((h) => !h.mustKeep)
    .sort((a, b) => a.cutPriority - b.cutPriority)
    .map((h) => h.id);
}

export function mustKeepHosts(): HostId[] {
  return HOST_CLAIMS.filter((h) => h.mustKeep).map((h) => h.id);
}

export type ClaimState = {
  surviving: HostId[];
  cut: HostId[];
  asOf: string;
  notes?: string;
};

/** Apply week-7 cuts: drop failing non-mustKeep hosts; if android-hello fails, cut it. */
export function applyCuts(
  green: Set<HostId>,
  options: { forceCut?: HostId[] } = {}
): ClaimState {
  const force = new Set(options.forceCut ?? []);
  const surviving: HostId[] = [];
  const cut: HostId[] = [];

  for (const claim of HOST_CLAIMS) {
    if (force.has(claim.id) || !green.has(claim.id)) {
      if (claim.mustKeep && !force.has(claim.id) && !green.has(claim.id)) {
        // must-keep still recorded as cut if red — ship decision is fail-loud
        cut.push(claim.id);
      } else {
        cut.push(claim.id);
      }
      continue;
    }
    surviving.push(claim.id);
  }

  return {
    surviving,
    cut,
    asOf: new Date().toISOString(),
  };
}
