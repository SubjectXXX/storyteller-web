/**
 * Storyteller player fixture data.
 *
 * Stage S1 ships clickable, fixture-driven shells for every player
 * surface. The fixtures below are the single source of truth that
 * every page reads from. The shape mirrors the eventual API contracts
 * (see docs/api/ once S2 ships) so swapping fixtures for real data is
 * a one-line change.
 *
 * Keep these fixtures deterministic: stable ids, stable dates, stable
 * order. Tests pin specific ids so a rename here requires a coordinated
 * test update.
 */

export type ScenarioRating = 'all-ages' | 'mature' | 'restricted';
export type ScenarioMood = 'romance' | 'mystery' | 'hope' | 'conflict';

export interface ScenarioFixture {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly rating: ScenarioRating;
  readonly synopsis: string;
  readonly moods: ReadonlyArray<ScenarioMood>;
  readonly durationMinutes: number;
  readonly chapters: number;
  /** CSS variable reference for the cover accent. */
  readonly coverAccent: string;
}

export interface ChoiceFixture {
  readonly id: string;
  readonly label: string;
  readonly tone: 'bold' | 'cautious' | 'playful';
}

export interface PlayTurnFixture {
  readonly id: string;
  readonly beat: string;
  readonly chapter: number;
  readonly narrative: string;
  readonly choices: ReadonlyArray<ChoiceFixture>;
}

export interface WalletFixture {
  readonly balanceCredits: number;
  readonly pendingReservations: number;
  readonly currency: 'credits';
  readonly packages: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly baseCredits: number;
    readonly bonusPercent: number;
    readonly priceLabel: string;
    readonly eligible: boolean;
    readonly reason?: string;
  }>;
}

export interface ReferralFixture {
  readonly code: string;
  readonly link: string;
  readonly inviterStatus: 'active' | 'paused' | 'revoked';
  readonly rewardsGranted: number;
  readonly tier: 'lantern' | 'cartographer' | 'wayfinder';
}

export interface SettingRowFixture {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly inherited?: boolean;
  readonly locked?: boolean;
  readonly lockedReason?: string;
}

export interface SettingGroupFixture {
  readonly id: string;
  readonly label: string;
  readonly rows: ReadonlyArray<SettingRowFixture>;
}

export const SCENARIO_FIXTURES: ReadonlyArray<ScenarioFixture> = [
  {
    id: 'demo-romance',
    title: 'A Quiet Court',
    author: 'Mira Tan',
    rating: 'mature',
    synopsis: 'Negotiate courtly intrigue in a city of stained glass and secrets.',
    moods: ['romance', 'conflict'],
    durationMinutes: 95,
    chapters: 8,
    coverAccent: 'var(--color-storyline-romance)',
  },
  {
    id: 'demo-mystery',
    title: 'The Cartographer\u2019s Last Letter',
    author: 'Sasha Onyebuchi',
    rating: 'all-ages',
    synopsis: 'Decode a vanished explorer\u2019s field notes before the next storm.',
    moods: ['mystery'],
    durationMinutes: 75,
    chapters: 6,
    coverAccent: 'var(--color-storyline-mystery)',
  },
  {
    id: 'demo-horizon',
    title: 'Beyond the Reef',
    author: 'Imani Reeve',
    rating: 'all-ages',
    synopsis: 'Pilot a windjammer through the Storm Lanes and broker peace at sea.',
    moods: ['hope'],
    durationMinutes: 120,
    chapters: 10,
    coverAccent: 'var(--color-storyline-hope)',
  },
  {
    id: 'demo-ember',
    title: 'Ember of the Lighthouse',
    author: 'Theo Vasquez',
    rating: 'mature',
    synopsis: 'Keep the lantern lit through a winter of disappearances and rumours.',
    moods: ['mystery', 'conflict'],
    durationMinutes: 110,
    chapters: 9,
    coverAccent: 'var(--color-storyline-conflict)',
  },
];

export const PLAY_FIXTURE: PlayTurnFixture = {
  id: 'turn-1',
  beat: 'The Salt-Wind Market',
  chapter: 1,
  narrative:
    'You step out of the carriage into the salt-wind market. Lanterns sway overhead and someone is calling your name \u2014 but not in warning. The marbled alley is loud with gossip; the lantern-seller winks at you like an old friend.',
  choices: [
    { id: 'choice-alley', label: 'Follow the call into the marbled alley', tone: 'bold' },
    { id: 'choice-linger', label: 'Linger near the lantern-seller to gather gossip', tone: 'cautious' },
    { id: 'choice-barge', label: 'Haggle passage on the night barge', tone: 'playful' },
  ],
};

export const WALLET_FIXTURE: WalletFixture = {
  balanceCredits: 12,
  pendingReservations: 1,
  currency: 'credits',
  packages: [
    {
      id: 'pkg-starter',
      name: 'Starter Pack',
      baseCredits: 100,
      bonusPercent: 0,
      priceLabel: '$5.00 USD',
      eligible: true,
    },
    {
      id: 'pkg-explorer',
      name: 'Explorer Pack',
      baseCredits: 500,
      bonusPercent: 10,
      priceLabel: '$22.00 USD',
      eligible: true,
    },
    {
      id: 'pkg-vault',
      name: 'Vault Pack',
      baseCredits: 2400,
      bonusPercent: 15,
      priceLabel: '$99.00 USD',
      eligible: false,
      reason: 'Currently available in EU, US, CA, AU only.',
    },
  ],
};

export const REFERRAL_FIXTURE: ReferralFixture = {
  code: 'WANDER-7821',
  link: 'https://storyteller.test/r/WANDER-7821',
  inviterStatus: 'active',
  rewardsGranted: 2,
  tier: 'cartographer',
};

export const SETTINGS_FIXTURE: ReadonlyArray<SettingGroupFixture> = [
  {
    id: 'memory',
    label: 'Infinite narrative & memory',
    rows: [
      { id: 'memory-window', label: 'Context window', value: '30 turns', inherited: true },
      { id: 'memory-summarize', label: 'Auto-summarize', value: 'On', inherited: true },
      { id: 'memory-chronicle', label: 'Chronicle max entries', value: '60', inherited: true },
    ],
  },
  {
    id: 'typography',
    label: 'Reading typography',
    rows: [
      { id: 'typo-typewriter', label: 'Typewriter', value: '18 ms/char' },
      { id: 'typo-motion', label: 'Reduce motion', value: 'Off' },
      { id: 'typo-font', label: 'Font family', value: 'Newsreader (serif)' },
    ],
  },
  {
    id: 'physical',
    label: 'Physical needs & survival',
    rows: [
      {
        id: 'physical-hunger',
        label: 'Hunger',
        value: 'Locked — not supported by current scenario',
        locked: true,
        lockedReason: 'The active scenario does not model hunger.',
      },
      { id: 'physical-sleep', label: 'Sleep', value: 'Off' },
    ],
  },
];

export function findScenario(id: string): ScenarioFixture | undefined {
  return SCENARIO_FIXTURES.find((s) => s.id === id);
}
