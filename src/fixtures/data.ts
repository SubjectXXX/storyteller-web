/**
 * Storyteller player fixture data.
 *
 * Offline-dev fixture set used by the player SPA while the real API
 * contracts are finalised. The fixtures below are the single source of
 * truth that every page falls back to. The shape mirrors the eventual
 * API contracts so swapping fixtures for real data is a one-line change.
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

export interface WalletRecentTransaction {
  readonly uuid: string;
  readonly kind: string;
  readonly reference_type: string | null;
  readonly reference_id: number | null;
  readonly posted_at: string | null;
  readonly total_credit: number;
  readonly total_debit: number;
  readonly balanced: boolean;
}

export interface WalletResource {
  readonly balance: number;
  readonly currency: string;
  readonly available?: number;
  readonly updated_at: string | null;
  readonly recent_transactions?: ReadonlyArray<WalletRecentTransaction>;
}

export const WALLET_RESOURCE_FIXTURE: WalletResource = {
  balance: 12,
  currency: 'credits',
  available: 12,
  updated_at: '2026-09-22T17:00:00Z',
  recent_transactions: [
    {
      uuid: '00000000-0000-0000-0000-000000000001',
      kind: 'top_up',
      reference_type: 'package',
      reference_id: 1,
      posted_at: '2026-09-22T17:00:00Z',
      total_credit: 500,
      total_debit: 0,
      balanced: true,
    },
    {
      uuid: '00000000-0000-0000-0000-000000000002',
      kind: 'spend',
      reference_type: 'turn',
      reference_id: 42,
      posted_at: '2026-09-22T17:05:00Z',
      total_credit: 0,
      total_debit: 1,
      balanced: true,
    },
  ],
};

// ---------- Stage 8 — Credit packages (S8-T01) ----------------------------
//
// Mirrors App\Http\Resources\CreditPackageResource on the API.
// Used by the /web/wallet page to render the top-up list and to send the
// canonical `package_slug` to POST /api/wallet/top-up.
export interface CreditPackageResource {
  readonly slug: string;
  readonly name: string;
  readonly credits: number;
  readonly price_cents: number;
  readonly currency: string;
  readonly is_active: boolean;
}

export const CREDIT_PACKAGE_FIXTURES: ReadonlyArray<CreditPackageResource> = [
  { slug: 'starter', name: 'Starter', credits: 500, price_cents: 999, currency: 'USD', is_active: true },
  { slug: 'value', name: 'Value', credits: 1500, price_cents: 2499, currency: 'USD', is_active: true },
  { slug: 'pro', name: 'Pro Pack', credits: 5000, price_cents: 6999, currency: 'USD', is_active: true },
];

// ---------- Stage 8 — Test-LLM probe response (S8-T02) --------------------
//
// Mirrors App\Http\Controllers\Me\AiTestController. The wallet page
// posts a fixed prompt and renders the text + usage + balance delta.
export interface AiTestResponse {
  readonly text: string;
  readonly model: string;
  readonly provider: string;
  readonly usage: {
    readonly input_tokens: number;
    readonly output_tokens: number;
    readonly total_tokens: number;
    readonly latency_ms: number;
    readonly finish_reason: string;
  };
  readonly cost_credit: number;
  readonly balance_before: number;
  readonly balance_after: number;
  readonly transaction_id: number;
  readonly transaction_uuid: string;
}

export const AI_TEST_RESPONSE_FIXTURE: AiTestResponse = {
  text: 'The lantern glows softly as you turn the page…',
  model: 'qwen/qwen3-vl-4b',
  provider: 'lmstudio',
  usage: { input_tokens: 42, output_tokens: 96, total_tokens: 138, latency_ms: 12450, finish_reason: 'stop' },
  cost_credit: 1,
  balance_before: 500,
  balance_after: 499,
  transaction_id: 1,
  transaction_uuid: '00000000-0000-0000-0000-000000000001',
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

// ---------- Stage 4 — Player defaults + per-adventure settings (S4-T05/T06) ---
//
// The player-defaults document (`/api/me/settings/player-defaults`) carries the
// eleven user-controlled knobs S4 introduces. The per-adventure endpoint
// (`/api/adventures/{id}/settings`) returns the same groups but resolves
// each one against scenario overrides / locks. The effective-settings
// endpoint (`/api/me/settings/effective`) is the resolved snapshot the
// player surface consumes for the live typography preview and inheritance
// tooltips.
//
// The contract mirrors the S4-T05 Laravel work — see
// `storyteller_api/app/Http/Controllers/AdventureSettings` for the wire.

export type SettingGroupState = 'inherit' | 'override' | 'reset' | 'locked';
export type SettingSource = 'user' | 'adventure' | 'scenario';

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
  readonly font_size: 'sm' | 'md' | 'lg';
  readonly reduced_motion: boolean;
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
  readonly font_size?: PlayerSettingsResource['font_size'];
  readonly reduced_motion?: boolean;
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
  font_size: 'md',
  reduced_motion: false,
  updated_at: '2026-09-22T17:00:00Z',
};

export interface AdventureSettingGroup {
  readonly id: string;
  readonly label: string;
  readonly value: string | number | boolean | null;
  readonly effective_value: string | number | boolean;
  readonly state: SettingGroupState;
  readonly source: SettingSource;
  readonly options?: ReadonlyArray<string>;
  readonly locked_reason: string | null;
}

export interface AdventureSettingsResource {
  readonly adventure_id: number;
  readonly branch_id: number;
  readonly groups: ReadonlyArray<AdventureSettingGroup>;
  readonly updated_at: string;
  /** Opaque etag for optimistic concurrency on `PUT /api/adventures/{id}/settings`. */
  readonly etag: string;
}

export interface AdventureSettingsGroupUpdate {
  readonly id: string;
  readonly state: SettingGroupState;
  /** Explicit override; required when state === 'override', ignored otherwise. */
  readonly value: string | number | boolean | null;
}

export interface AdventureSettingsUpdateRequest {
  readonly branch_id?: number | null;
  readonly groups: ReadonlyArray<AdventureSettingsGroupUpdate>;
  /** Optional If-Match token; sent on PUT so the server rejects stale edits. */
  readonly if_match?: string | null;
}

export const ADVENTURE_SETTINGS_FIXTURE: AdventureSettingsResource = {
  adventure_id: ADVENTURE_FIXTURE.id,
  branch_id: ADVENTURE_FIXTURE.current_branch.id,
  updated_at: '2026-09-22T17:00:00Z',
  etag: 'W/"adventure-settings-fixture-v1"',
  groups: [
    {
      id: 'typewriter_mode',
      label: 'Typewriter reveal',
      value: null,
      effective_value: true,
      state: 'inherit',
      source: 'user',
      options: undefined,
      locked_reason: null,
    },
    {
      id: 'theme',
      label: 'Theme',
      value: null,
      effective_value: 'dark',
      state: 'inherit',
      source: 'user',
      options: ['light', 'dark', 'system'],
      locked_reason: null,
    },
    {
      id: 'narration_verbosity',
      label: 'Narration verbosity',
      value: 'rich',
      effective_value: 'rich',
      state: 'override',
      source: 'adventure',
      options: ['terse', 'balanced', 'rich'],
      locked_reason: null,
    },
    {
      id: 'content_rating',
      label: 'Content rating',
      value: null,
      effective_value: 'mature',
      state: 'inherit',
      source: 'user',
      options: ['all-ages', 'mature', 'restricted'],
      locked_reason: null,
    },
    {
      id: 'action_mode',
      label: 'Action mode',
      value: null,
      effective_value: 'guided',
      state: 'inherit',
      source: 'user',
      options: ['guided', 'sandbox', 'ask'],
      locked_reason: null,
    },
    {
      id: 'world_genre',
      label: 'World genre preference',
      value: null,
      effective_value: 'any',
      state: 'inherit',
      source: 'user',
      options: ['romance', 'mystery', 'hope', 'conflict', 'any'],
      locked_reason: null,
    },
    {
      id: 'language',
      label: 'Narration language',
      value: null,
      effective_value: 'en',
      state: 'locked',
      source: 'scenario',
      options: ['en', 'es', 'fr', 'de', 'ja'],
      locked_reason: 'This scenario ships English-only narration assets.',
    },
    {
      id: 'suggested_choices_count',
      label: 'Suggested choices',
      value: null,
      effective_value: 3,
      state: 'inherit',
      source: 'user',
      options: ['2', '3', '4'],
      locked_reason: null,
    },
    {
      id: 'dice_visibility',
      label: 'Dice visibility',
      value: null,
      effective_value: 'summary',
      state: 'inherit',
      source: 'user',
      options: ['hidden', 'summary', 'detailed'],
      locked_reason: null,
    },
    {
      id: 'npc_dialogue_density',
      label: 'NPC dialogue density',
      value: null,
      effective_value: 'natural',
      state: 'inherit',
      source: 'user',
      options: ['minimal', 'natural', 'verbose'],
      locked_reason: null,
    },
  ],
};

export interface EffectiveSettingGroup {
  readonly id: string;
  readonly label: string;
  readonly effective_value: string | number | boolean;
  readonly source: SettingSource;
  readonly state: SettingGroupState;
  readonly locked_reason: string | null;
}

export interface EffectiveSettingsResource {
  readonly adventure_id: number;
  readonly branch_id: number | null;
  readonly groups: ReadonlyArray<EffectiveSettingGroup>;
  readonly updated_at: string;
  /** Opaque etag mirroring the source `AdventureSettingsResource`. */
  readonly etag: string;
}

export const EFFECTIVE_SETTINGS_FIXTURE: EffectiveSettingsResource = {
  adventure_id: ADVENTURE_FIXTURE.id,
  branch_id: ADVENTURE_FIXTURE.current_branch.id,
  updated_at: '2026-09-22T17:00:00Z',
  etag: 'W/"adventure-settings-fixture-v1"',
  groups: ADVENTURE_SETTINGS_FIXTURE.groups.map((g) => ({
    id: g.id,
    label: g.label,
    effective_value: g.effective_value,
    source: g.source,
    state: g.state,
    locked_reason: g.locked_reason,
  })),
};

// ---------- Stage 5 — Memory: Recap (S5-T01) --------------------------------
//
// The recap endpoint ships a chronicle of recent beats (turns) and the
// timestamp the LLM last refreshed it. Versions are derived per turn so
// the panel can dedupe without an extra round-trip.

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
    {
      turn_id: 1,
      sequence_number: 1,
      headline: 'You arrive at the archive, lantern oil rationed to three days.',
      happened_at: '2026-09-22T17:30:00Z',
    },
    {
      turn_id: 2,
      sequence_number: 2,
      headline: 'Imogen stops you at the door and asks for the cartographer\u2019s letter.',
      happened_at: '2026-09-22T17:45:00Z',
    },
    {
      turn_id: 3,
      sequence_number: 3,
      headline: 'You notice the lantern over the reading table is almost out.',
      happened_at: '2026-09-22T18:00:00Z',
    },
  ],
};

// ---------- Stage 5 — Memory: Lore entries (S5-T01) ------------------------
//
// `LoreEntry` is the canonical "fact the LLM remembered" the player can
// see on the lore tab. Versions are monotonic per `(adventure_id, key)`
// so the SPA can show "v3" once the memory worker updates an entry.

export interface LoreEntry {
  readonly key: string;
  readonly title: string;
  readonly body: string;
  readonly version: number;
  readonly tags: ReadonlyArray<string>;
  readonly scenario_slug: string;
  readonly updated_at: string;
}

export interface LoreListResponse {
  readonly adventure_id: number;
  readonly entries: ReadonlyArray<LoreEntry>;
}

export const LORE_FIXTURE: LoreListResponse = {
  adventure_id: ADVENTURE_FIXTURE.id,
  entries: [
    {
      key: 'archive.location',
      title: 'The archive sits on the cliffs',
      body: 'Storm-battered limestone archive perched above the harbour, kept warm by a single iron stove.',
      version: 3,
      tags: ['location', 'archive'],
      scenario_slug: 'demo-mystery',
      updated_at: '2026-09-22T17:10:00Z',
    },
    {
      key: 'npc.imogen.role',
      title: 'Imogen is the archive keeper',
      body: 'Imogen Veil curates the cartographer\u2019s letters and remembers every visitor\u2019s name since the Spring melt.',
      version: 2,
      tags: ['npc', 'imogen'],
      scenario_slug: 'demo-mystery',
      updated_at: '2026-09-22T17:05:00Z',
    },
    {
      key: 'rumour.lantern.shortage',
      title: 'Lantern oil is rationed this week',
      body: 'A barge from the mainland shorted the village on lantern oil; Imogen has been turning visitors away after dusk.',
      version: 1,
      tags: ['rumour', 'lantern'],
      scenario_slug: 'demo-mystery',
      updated_at: '2026-09-22T17:00:00Z',
    },
  ],
};

// ---------- Stage 5 — Memory: Player-pinned memories (S5-T02) ---------------
//
// `PinnedMemory` is what the player explicitly starred from the recap or
// lore tab. The API exposes them as a flat list scoped to the adventure.

export interface PinnedMemory {
  readonly id: number;
  readonly kind: 'recap' | 'lore';
  readonly ref_id: string;
  readonly title: string;
  readonly body: string;
  readonly pinned_at: string;
}

export interface PinnedMemoryListResponse {
  readonly adventure_id: number;
  readonly pinned: ReadonlyArray<PinnedMemory>;
}

export const PINNED_MEMORY_FIXTURE: PinnedMemoryListResponse = {
  adventure_id: ADVENTURE_FIXTURE.id,
  pinned: [],
};

// ---------- Stage 6 — Visual generation: Image job (S6-T01) ----------------
//
// The Stage 6 API issues a background job per image request and exposes a
// polling endpoint at `/api/image-jobs/{jobId}`. The fixture transport
// resolves `completed` after one polling interval so the SPA shell can
// exercise the polling path without a real backend.

export type ImageJobStatus = 'queued' | 'generating' | 'completed' | 'failed';

export interface ImageAsset {
  readonly id: string;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
}

export interface ImageJobResponse {
  readonly job_id: string;
  readonly adventure_id: number;
  readonly branch_id: number;
  readonly turn_id: number;
  readonly prompt: string;
  readonly status: ImageJobStatus;
  readonly asset: ImageAsset | null;
  readonly error: { readonly message: string; readonly code?: string } | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export const SAMPLE_IMAGE_ALT =
  'A misty harbour at dusk, lanterns reflected in still water, painted in soft amber and slate.';

// Path under `public/`. The vite base is `/web/` so the absolute URL the
// player sees in production is `/web/fixtures/sample-image.svg`. Tests
// reference the same path via `IMG_FIXTURE_URL`.
export const IMG_FIXTURE_URL = '/fixtures/sample-image.svg';

export const IMAGE_ASSET_FIXTURE: ImageAsset = {
  id: 'asset-misty-harbour-001',
  url: IMG_FIXTURE_URL,
  width: 1280,
  height: 720,
  alt: SAMPLE_IMAGE_ALT,
};

// Three carousel entries — what the player sees in the gallery before any
// new generations arrive. Keep the URLs stable so tests can pin them.
export const IMAGE_CAROUSEL_FIXTURE: ReadonlyArray<ImageAsset> = [
  IMAGE_ASSET_FIXTURE,
  {
    id: 'asset-archive-002',
    url: IMG_FIXTURE_URL,
    width: 1280,
    height: 720,
    alt: 'Storm-battered limestone archive perched above a misty harbour.',
  },
  {
    id: 'asset-village-003',
    url: IMG_FIXTURE_URL,
    width: 1280,
    height: 720,
    alt: 'Lantern-lit village lane leading to the archive at dusk.',
  },
];

export const DEFAULT_IMAGE_PROMPT = 'A misty harbour at dusk, cinematic lighting';

// `pending` fixture used by tests that exercise the queued → completed path
// before any polling has happened. The default `IMAGE_JOB_COMPLETED_FIXTURE`
// resolves the carousel asset so the SPA can render without a real backend.
export const IMAGE_JOB_QUEUED_FIXTURE: ImageJobResponse = {
  job_id: 'job-fixture-queued-001',
  adventure_id: ADVENTURE_FIXTURE.id,
  branch_id: ADVENTURE_FIXTURE.current_branch.id,
  turn_id: 1,
  prompt: DEFAULT_IMAGE_PROMPT,
  status: 'queued',
  asset: null,
  error: null,
  created_at: '2026-09-22T18:00:00Z',
  updated_at: '2026-09-22T18:00:00Z',
};

export const IMAGE_JOB_GENERATING_FIXTURE: ImageJobResponse = {
  ...IMAGE_JOB_QUEUED_FIXTURE,
  job_id: 'job-fixture-generating-001',
  status: 'generating',
  updated_at: '2026-09-22T18:00:01Z',
};

export const IMAGE_JOB_COMPLETED_FIXTURE: ImageJobResponse = {
  ...IMAGE_JOB_QUEUED_FIXTURE,
  job_id: 'job-fixture-completed-001',
  status: 'completed',
  asset: IMAGE_ASSET_FIXTURE,
  updated_at: '2026-09-22T18:00:02Z',
};
// ---------- Stage 4 — World panels (S4-T01) --------------------------------
//
// These resource shapes mirror the S4-T01 controller responses. The SPA
// carries the contract locally so the API worker can implement against the
// same fields without an SPA rewrite.

export interface CharacterStat {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly max: number | null;
  readonly icon?: string | null;
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
  adventure_id: 1,
  branch_id: 1,
  name: 'Imogen Vex',
  role: 'Investigative journalist',
  portrait_url: null,
  stats: [
    { id: 'resolve', label: 'Resolve', value: 4, max: 6 },
    { id: 'reputation', label: 'Reputation', value: 3, max: 5 },
    { id: 'fortune', label: 'Fortune', value: 2, max: null },
  ],
  traits: [
    { id: 'curious', label: 'Curious', description: 'Drawn to questions others shy away from.' },
    { id: 'careful', label: 'Careful', description: null },
  ],
  notes: 'Prefers tea over coffee and carries a notebook at all times.',
};

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

export const NPC_FIXTURE: ReadonlyArray<NpcResource> = [
  {
    id: 101,
    name: 'Captain Morrow',
    role: 'Harbourmaster',
    disposition: 'guarded',
    location: 'Dockside office',
    portrait_url: null,
    tags: ['authority', 'knows-the-law'],
    alive: true,
    relationships: [
      { target_npc_id: 102, target_name: 'Lyssa', kind: 'family', affinity: 80 },
      { target_npc_id: 103, target_name: 'Quentin', kind: 'rival', affinity: 25 },
    ],
  },
  {
    id: 102,
    name: 'Lyssa',
    role: 'Dockhand',
    disposition: 'friendly',
    location: 'Warehouse 12',
    portrait_url: null,
    tags: ['crew'],
    alive: true,
    relationships: [],
  },
];

// ---------- Stage 4 — Branch tree + ops (S4-T03) -------------------------

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
  adventure_id: 1,
  active_branch_id: 1,
  branches: [
    {
      id: 1,
      name: 'Root',
      depth: 0,
      parent_branch_id: null,
      parent_turn_id: null,
      is_active: true,
      can_retry: true,
      can_undo: false,
      can_redo: false,
      turn_count: 3,
    },
    {
      id: 2,
      name: 'Followed the ledger',
      depth: 1,
      parent_branch_id: 1,
      parent_turn_id: 2,
      is_active: false,
      can_retry: false,
      can_undo: true,
      can_redo: true,
      turn_count: 1,
    },
  ],
};

export interface BranchRetryRequest {
  readonly turn_id?: number | null;
  readonly name?: string | null;
}

export interface BranchUndoRequest {
  readonly turn_id?: number | null;
  readonly name?: string | null;
}

export interface BranchRedoRequest {
  readonly turn_id?: number | null;
  readonly name?: string | null;
}

// ---------- Stage 4 — Dice & clock mechanic events (S4-T01) --------------

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

export const DICE_ROLL_FIXTURE: DiceRollFixture = {
  kind: 'dice',
  formula: '1d20+3',
  total: 17,
  rolls: [14],
  modifier: 3,
  success: 'pass',
  reason: 'Stealth check vs. locked door',
  actor_id: 'imogen',
};

export interface ClockTickFixture {
  readonly kind: 'clock';
  readonly clock_id: string;
  readonly label: string;
  readonly from: number;
  readonly to: number;
  readonly max: number;
  readonly reason: string | null;
}

export const CLOCK_TICK_FIXTURE: ClockTickFixture = {
  kind: 'clock',
  clock_id: 'suspicion',
  label: 'Suspicion',
  from: 1,
  to: 2,
  max: 6,
  reason: 'Imogen was seen reading the letter.',
};