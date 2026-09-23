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

// ---------------------------------------------------------------------------
// S2 vertical slice fixtures.
//
// The SPA still renders in offline/dev mode using these fixtures, so they
// MUST mirror the API contract documented at `docs/api/openapi.yaml`. The
// shapes diverge from the legacy S1 fixtures (e.g. `ScenarioResource` now
// has `slug` + `latest_version` instead of `id`; `WalletResource` uses
// `balance` + `currency`; etc.) so we define a parallel set of fixtures
// rather than mutating the S1 ones.
// ---------------------------------------------------------------------------

export interface UserResource {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly is_admin: boolean;
  readonly attests_adult: boolean;
  readonly email_verified: boolean;
  readonly locale: string;
  readonly created_at: string;
}

export interface AuthTokenResource {
  readonly token: string;
  readonly user: UserResource;
}

export const USER_FIXTURE: UserResource = {
  id: 1,
  name: 'Wren Avery',
  email: 'wren@example.com',
  is_admin: false,
  attests_adult: true,
  email_verified: true,
  locale: 'en',
  created_at: '2026-09-01T10:00:00Z',
};

export const AUTH_FIXTURE: AuthTokenResource = {
  token: 'fixture-token-1234|abcd',
  user: USER_FIXTURE,
};

export interface ScenarioResource {
  readonly id: number;
  readonly slug: string;
  readonly title: string;
  readonly blurb: string;
  readonly cover_url: string | null;
  readonly tags: ReadonlyArray<string>;
  readonly is_published: boolean;
  readonly is_featured: boolean;
  readonly latest_version: number;
  readonly length_estimate_minutes: number | null;
  readonly created_at: string;
}

export const SCENARIO_RESOURCE_FIXTURES: ReadonlyArray<ScenarioResource> = SCENARIO_FIXTURES.map(
  (s, idx): ScenarioResource => ({
    id: idx + 1,
    slug: s.id,
    title: s.title,
    blurb: s.synopsis,
    cover_url: null,
    tags: s.moods,
    is_published: true,
    is_featured: idx === 0,
    latest_version: 1,
    length_estimate_minutes: s.durationMinutes,
    created_at: '2026-09-01T10:00:00Z',
  }),
);

export interface SuggestedChoice {
  readonly id: string;
  readonly label: string;
  readonly description: string | null;
}

export interface ScenarioVersionResource {
  readonly version: number;
  readonly manifest: {
    readonly title: string;
    readonly locale: string;
    readonly length_estimate_minutes: number | null;
    readonly content_warnings: ReadonlyArray<string>;
  };
  readonly starting_state: Readonly<Record<string, unknown>>;
  readonly suggested_choices: ReadonlyArray<SuggestedChoice>;
}

export const SCENARIO_VERSION_FIXTURE: ScenarioVersionResource = {
  version: 1,
  manifest: {
    title: 'The Cartographer\u2019s Last Letter',
    locale: 'en',
    length_estimate_minutes: 75,
    content_warnings: [],
  },
  starting_state: { location: 'archive' },
  suggested_choices: PLAY_FIXTURE.choices.map((c) => ({ id: c.id, label: c.label, description: null })),
};

export type AdventureStatus = 'active' | 'completed' | 'abandoned';

export interface BranchResource {
  readonly id: number;
  readonly name: string;
  readonly depth: number;
  readonly version: number;
  readonly parent_branch_id: number | null;
  readonly parent_turn_id: number | null;
  readonly state: Readonly<Record<string, unknown>>;
}

export interface AdventureResource {
  readonly id: number;
  readonly scenario_id: number;
  readonly scenario_slug: string;
  readonly scenario_version: number;
  readonly title: string;
  readonly status: AdventureStatus;
  readonly current_branch: BranchResource;
  readonly last_played_at: string | null;
  readonly created_at: string;
}

export const ADVENTURE_FIXTURE: AdventureResource = {
  id: 101,
  scenario_id: 1,
  scenario_slug: 'demo-mystery',
  scenario_version: 1,
  title: 'The Cartographer\u2019s Last Letter',
  status: 'active',
  current_branch: {
    id: 1,
    name: 'main',
    depth: 0,
    version: 1,
    parent_branch_id: null,
    parent_turn_id: null,
    state: {
      location: 'archive',
      inventory: [
        { id: 'item-letter', name: 'Cartographer\u2019s last letter', description: 'A folded note in the cartographer\u2019s hand.', weight: 0, count: 1, slot: 'quest', icon: null },
        { id: 'item-lantern', name: 'Tin lantern', description: 'Reliable, but heavy.', weight: 1.2, count: 1, slot: 'carry', icon: 'lantern' },
        { id: 'item-coin', name: 'Silver coin', description: 'A token from a foreign port.', weight: 0.02, count: 6, slot: 'stored', icon: 'coin' },
      ],
      mechanics: {
        kind: 'clock',
        clock_id: 'suspicion',
        label: 'Suspicion',
        from: 1,
        to: 2,
        max: 6,
        reason: 'Imogen saw you read the letter.',
      },
    },
  },
  last_played_at: '2026-09-22T18:00:00Z',
  created_at: '2026-09-22T17:00:00Z',
};

export const ADVENTURE_LIST_FIXTURE: ReadonlyArray<AdventureResource> = [ADVENTURE_FIXTURE];

export interface TurnResource {
  readonly id: number;
  readonly adventure_id: number;
  readonly branch_id: number;
  readonly parent_turn_id: number | null;
  readonly sequence_number: number;
  readonly choice_id: string | null;
  readonly free_text: string | null;
  readonly narration: string;
  readonly suggested_choices: ReadonlyArray<SuggestedChoice>;
  readonly state_after: Readonly<Record<string, unknown>>;
  readonly idempotency_key: string;
  readonly created_at: string;
}

export const TURN_FIXTURE: TurnResource = {
  id: 1,
  adventure_id: 101,
  branch_id: 1,
  parent_turn_id: null,
  sequence_number: 1,
  choice_id: null,
  free_text: null,
  narration: PLAY_FIXTURE.narrative,
  suggested_choices: SCENARIO_VERSION_FIXTURE.suggested_choices,
  state_after: { location: 'archive' },
  idempotency_key: '00000000-0000-0000-0000-000000000001',
  created_at: '2026-09-22T17:01:00Z',
};

export interface WalletResource {
  readonly balance: number;
  readonly currency: string;
  readonly updated_at: string;
}

export const WALLET_RESOURCE_FIXTURE: WalletResource = {
  balance: 12,
  currency: 'credits',
  updated_at: '2026-09-22T17:00:00Z',
};

export interface ReferralResource {
  readonly code: string;
  readonly count: number;
  readonly rewards_earned: number;
  readonly updated_at: string;
}

export const REFERRAL_RESOURCE_FIXTURE: ReferralResource = {
  code: 'WANDER-7821',
  count: 2,
  rewards_earned: 2,
  updated_at: '2026-09-22T17:00:00Z',
};

export interface SettingsResource {
  readonly theme: 'light' | 'dark' | 'system';
  readonly font_size: 'sm' | 'md' | 'lg';
  readonly reduced_motion: boolean;
  readonly typewriter_mode: boolean;
  readonly content_warnings: ReadonlyArray<string>;
  readonly updated_at: string;
}

export const SETTINGS_RESOURCE_FIXTURE: SettingsResource = {
  theme: 'system',
  font_size: 'md',
  reduced_motion: false,
  typewriter_mode: true,
  content_warnings: [],
  updated_at: '2026-09-22T17:00:00Z',
};

// ---------------------------------------------------------------------------
// Stage 4 — Game engine and branching fixtures.
//
// The SPA must render before the API worker ships the S4-T01..T05 endpoints,
// so we ship fixture data that mirrors the wire contract documented at the
// top of each hook. Swapping fixtures for the live fetcher is a one-line
// change in `ApiClientProvider` once the API exposes the endpoints.
// ---------------------------------------------------------------------------

// ---------- Character (S4-T01) --------------------------------------------

export interface CharacterStat {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly max: number | null;
  readonly icon: string | null;
}

export interface CharacterTrait {
  readonly id: string;
  readonly label: string;
  readonly description: string | null;
}

export interface CharacterResource {
  readonly id: number;
  readonly adventure_id: number;
  readonly branch_id: number;
  readonly name: string;
  readonly role: string;
  readonly portrait_url: string | null;
  readonly stats: ReadonlyArray<CharacterStat>;
  readonly traits: ReadonlyArray<CharacterTrait>;
  readonly notes: string | null;
}

export const CHARACTER_FIXTURE: CharacterResource = {
  id: 1,
  adventure_id: ADVENTURE_FIXTURE.id,
  branch_id: ADVENTURE_FIXTURE.current_branch.id,
  name: 'Wren Avery',
  role: 'Cartographer',
  portrait_url: null,
  stats: [
    { id: 'stamina', label: 'Stamina', value: 14, max: 20, icon: 'stamina' },
    { id: 'focus', label: 'Focus', value: 9, max: 12, icon: 'focus' },
    { id: 'reputation', label: 'Reputation', value: 5, max: null, icon: 'reputation' },
  ],
  traits: [
    { id: 't-cartographer', label: 'Cartographer', description: 'Reads maps as if they were letters.' },
    { id: 't-paranoid', label: 'Cautious', description: 'Asks twice before committing.' },
  ],
  notes: 'Currently in the archive, chasing the cartographer\u2019s last letter.',
};

// ---------- NPC roster (S4-T01) -------------------------------------------

export type NpcRelationshipKind = 'ally' | 'rival' | 'family' | 'neutral' | 'unknown';

export interface NpcRelationship {
  readonly target_npc_id: number;
  readonly target_name: string;
  readonly kind: NpcRelationshipKind;
  readonly affinity: number;
}

export interface NpcResource {
  readonly id: number;
  readonly name: string;
  readonly role: string;
  readonly disposition: string;
  readonly location: string | null;
  readonly portrait_url: string | null;
  readonly tags: ReadonlyArray<string>;
  readonly alive: boolean;
  readonly relationships: ReadonlyArray<NpcRelationship>;
}

export const NPC_ROSTER_FIXTURE: ReadonlyArray<NpcResource> = [
  {
    id: 11,
    name: 'Imogen Wren',
    role: 'Sister',
    disposition: 'wary',
    location: 'archive door',
    portrait_url: null,
    tags: ['family'],
    alive: true,
    relationships: [
      { target_npc_id: 12, target_name: 'Bram Hark', kind: 'rival', affinity: -2 },
    ],
  },
  {
    id: 12,
    name: 'Bram Hark',
    role: 'Rival cartographer',
    disposition: 'smug',
    location: 'upper gallery',
    portrait_url: null,
    tags: ['rival'],
    alive: true,
    relationships: [
      { target_npc_id: 11, target_name: 'Imogen Wren', kind: 'rival', affinity: -2 },
    ],
  },
  {
    id: 13,
    name: 'Old Magnusson',
    role: 'Curator',
    disposition: 'neutral',
    location: 'reading room',
    portrait_url: null,
    tags: ['ally'],
    alive: true,
    relationships: [],
  },
];

// ---------- Recap (S4-T05, served by Stage 5; placeholder for now) -------

export interface RecapTurn {
  readonly turn_id: number;
  readonly sequence_number: number;
  readonly headline: string;
  readonly happened_at: string;
}

export interface RecapResource {
  readonly adventure_id: number;
  readonly branch_id: number;
  readonly generated_at: string;
  readonly turns: ReadonlyArray<RecapTurn>;
}

export const RECAP_FIXTURE: RecapResource = {
  adventure_id: ADVENTURE_FIXTURE.id,
  branch_id: ADVENTURE_FIXTURE.current_branch.id,
  generated_at: '2026-09-22T18:00:00Z',
  turns: [
    { turn_id: 1, sequence_number: 1, headline: 'You arrive at the archive.', happened_at: '2026-09-22T17:30:00Z' },
    { turn_id: 2, sequence_number: 2, headline: 'Imogen stops you at the door.', happened_at: '2026-09-22T17:45:00Z' },
  ],
};

// ---------- Branch tree + ops (S4-T03) ------------------------------------

export interface BranchTreeNode {
  readonly id: number;
  readonly name: string;
  readonly depth: number;
  readonly parent_branch_id: number | null;
  readonly parent_turn_id: number | null;
  readonly is_active: boolean;
  readonly can_retry: boolean;
  readonly can_undo: boolean;
  readonly can_redo: boolean;
  readonly turn_count: number;
}

export interface BranchTreeResponse {
  readonly adventure_id: number;
  readonly active_branch_id: number;
  readonly branches: ReadonlyArray<BranchTreeNode>;
}

export const BRANCH_TREE_FIXTURE: BranchTreeResponse = {
  adventure_id: ADVENTURE_FIXTURE.id,
  active_branch_id: ADVENTURE_FIXTURE.current_branch.id,
  branches: [
    {
      id: 1,
      name: 'main',
      depth: 0,
      parent_branch_id: null,
      parent_turn_id: null,
      is_active: true,
      can_retry: true,
      can_undo: true,
      can_redo: false,
      turn_count: 2,
    },
    {
      id: 2,
      name: 'fork-1',
      depth: 1,
      parent_branch_id: 1,
      parent_turn_id: 1,
      is_active: false,
      can_retry: false,
      can_undo: false,
      can_redo: false,
      turn_count: 1,
    },
  ],
};

export interface BranchRetryRequest {
  readonly turn_id: number;
  readonly name?: string | null;
}

export interface BranchUndoRequest {
  readonly turn_id?: number | null;
}

export interface BranchRedoRequest {
  readonly turn_id?: number | null;
}

// ---------- Adventure settings (S4-T05 + S4-T06) ---------------------------

export type SettingGroupState = 'inherit' | 'override' | 'reset' | 'locked';
export type SettingSource = 'user' | 'adventure' | 'scenario';

export interface AdventureSettingGroup {
  readonly id: string;
  readonly label: string;
  readonly value: string | number | boolean;
  readonly effective_value: string | number | boolean;
  readonly state: SettingGroupState;
  readonly source: SettingSource;
  readonly options?: ReadonlyArray<string>;
  readonly locked_reason?: string | null;
}

export interface AdventureSettingsResource {
  readonly adventure_id: number;
  readonly branch_id: number;
  readonly groups: ReadonlyArray<AdventureSettingGroup>;
  readonly updated_at: string;
}

export interface AdventureSettingsGroupUpdate {
  readonly id: string;
  readonly state: SettingGroupState;
  readonly value: string | number | boolean | null;
}

export interface AdventureSettingsUpdateRequest {
  readonly branch_id?: number | null;
  readonly groups: ReadonlyArray<AdventureSettingsGroupUpdate>;
}

export interface EffectiveSettingsResource {
  readonly adventure_id: number;
  readonly branch_id: number;
  readonly groups: ReadonlyArray<AdventureSettingGroup>;
  readonly updated_at: string;
}

export const ADVENTURE_SETTINGS_FIXTURE: AdventureSettingsResource = {
  adventure_id: ADVENTURE_FIXTURE.id,
  branch_id: ADVENTURE_FIXTURE.current_branch.id,
  updated_at: '2026-09-22T17:00:00Z',
  groups: [
    {
      id: 'typewriter_mode',
      label: 'Typewriter reveal',
      value: true,
      effective_value: true,
      state: 'inherit',
      source: 'user',
    },
    {
      id: 'theme',
      label: 'Theme',
      value: 'system',
      effective_value: 'system',
      state: 'inherit',
      source: 'user',
    },
    {
      id: 'narration_verbosity',
      label: 'Narration verbosity',
      value: 'balanced',
      effective_value: 'balanced',
      state: 'inherit',
      source: 'user',
    },
    {
      id: 'content_rating',
      label: 'Content rating',
      value: 'mature',
      effective_value: 'mature',
      state: 'inherit',
      source: 'user',
    },
    {
      id: 'action_mode',
      label: 'Action mode',
      value: 'guided',
      effective_value: 'guided',
      state: 'inherit',
      source: 'user',
    },
    {
      id: 'world_genre',
      label: 'World genre preference',
      value: 'any',
      effective_value: 'any',
      state: 'inherit',
      source: 'user',
    },
    {
      id: 'language',
      label: 'Narration language',
      value: 'en',
      effective_value: 'en',
      state: 'inherit',
      source: 'user',
    },
    {
      id: 'suggested_choices_count',
      label: 'Suggested choices',
      value: 3,
      effective_value: 3,
      state: 'inherit',
      source: 'user',
    },
    {
      id: 'dice_visibility',
      label: 'Dice visibility',
      value: 'summary',
      effective_value: 'summary',
      state: 'inherit',
      source: 'user',
    },
    {
      id: 'npc_dialogue_density',
      label: 'NPC dialogue density',
      value: 'natural',
      effective_value: 'natural',
      state: 'reset',
      source: 'scenario',
      locked_reason: 'The active scenario locks this control to scenario defaults.',
    },
  ],
};

export const EFFECTIVE_SETTINGS_FIXTURE: EffectiveSettingsResource = {
  adventure_id: ADVENTURE_FIXTURE.id,
  branch_id: ADVENTURE_FIXTURE.current_branch.id,
  updated_at: '2026-09-22T17:00:00Z',
  groups: ADVENTURE_SETTINGS_FIXTURE.groups.map((g) => ({ ...g })),
};

// ---------- Player settings (S4-T06) --------------------------------------

export interface PlayerSettingsResource {
  readonly typewriter_mode: boolean;
  readonly theme: 'light' | 'dark' | 'system';
  readonly content_rating: 'all-ages' | 'mature' | 'restricted';
  readonly action_mode: 'guided' | 'sandbox' | 'ask';
  readonly world_genre: 'romance' | 'mystery' | 'hope' | 'conflict' | 'any';
  readonly language: string;
  readonly narration_verbosity: 'terse' | 'balanced' | 'rich';
  readonly suggested_choices_count: number;
  readonly dice_visibility: 'hidden' | 'summary' | 'detailed';
  readonly npc_dialogue_density: 'minimal' | 'natural' | 'verbose';
  readonly updated_at: string;
}

export interface PlayerSettingsUpdateRequest {
  readonly typewriter_mode?: boolean;
  readonly theme?: PlayerSettingsResource['theme'];
  readonly content_rating?: PlayerSettingsResource['content_rating'];
  readonly action_mode?: PlayerSettingsResource['action_mode'];
  readonly world_genre?: PlayerSettingsResource['world_genre'];
  readonly language?: string;
  readonly narration_verbosity?: PlayerSettingsResource['narration_verbosity'];
  readonly suggested_choices_count?: number;
  readonly dice_visibility?: PlayerSettingsResource['dice_visibility'];
  readonly npc_dialogue_density?: PlayerSettingsResource['npc_dialogue_density'];
}

export const PLAYER_SETTINGS_FIXTURE: PlayerSettingsResource = {
  typewriter_mode: true,
  theme: 'system',
  content_rating: 'mature',
  action_mode: 'guided',
  world_genre: 'any',
  language: 'en',
  narration_verbosity: 'balanced',
  suggested_choices_count: 3,
  dice_visibility: 'summary',
  npc_dialogue_density: 'natural',
  updated_at: '2026-09-22T17:00:00Z',
};

// ---------- Mechanics payload (S4-T02) ------------------------------------
//
// `TurnResource.state_after.mechanics` and (later) `usage.mechanics` follow
// the same `MechanicEvent` shape. The fixture embeds a clock tick so the
// `<DiceClockPanel>` has something to render during dev.

export interface DiceRollFixture {
  readonly kind: 'dice';
  readonly formula: string;
  readonly total: number;
  readonly rolls: ReadonlyArray<number>;
  readonly modifier: number;
  readonly success: 'pass' | 'fail' | 'mixed' | null;
  readonly reason: string | null;
  readonly actor_id: string | null;
}

export interface ClockTickFixture {
  readonly kind: 'clock';
  readonly clock_id: string;
  readonly label: string;
  readonly from: number;
  readonly to: number;
  readonly max: number;
  readonly reason: string | null;
}

export type MechanicEventFixture = DiceRollFixture | ClockTickFixture;

export const CLOCK_TICK_FIXTURE: ClockTickFixture = {
  kind: 'clock',
  clock_id: 'suspicion',
  label: 'Suspicion',
  from: 1,
  to: 2,
  max: 6,
  reason: 'Imogen saw you read the letter.',
};
