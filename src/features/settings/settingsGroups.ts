/**
 * Storyteller player settings group catalogue (S4-T06).
 *
 * SINGLE SOURCE OF TRUTH for every player-visible setting. Both
 * `UserSettingsPage` and `AdventureSettingsDrawer` render from this list via
 * the shared `SettingsGroupRow`, so adding a setting group is a one-file
 * change. There is deliberately no second catalogue anywhere in the SPA.
 *
 * ## Wire binding
 *
 * `id` doubles as the wire key the API expects. Which document carries the
 * key is declared by `document`:
 *
 *   - `'player-defaults'` → `PlayerSettingsResource` via
 *     `GET/PUT /api/me/settings/player-defaults` (`Me\PlayerSettingsController`).
 *   - `'legacy'`         → `SettingsResource` via `GET/PUT /api/me/settings`
 *     (`Settings\SettingsController`). The server's player-defaults
 *     allow-list does not include these keys, so they can only be written
 *     through the S2 document.
 *
 * ## Scope + lock semantics
 *
 * `scope` mirrors `App\Models\SettingGroup::$scope`. `SettingsResolver`
 * only consults the player's own default for keys scoped `user` or
 * `adventure`; a `scenario`-scoped key resolves from the scenario/system
 * default, so writing a user default for it is accepted by the API but has
 * no effect. The surfaces disable those controls rather than pretend the
 * choice will stick.
 *
 * `defaultValue` is what the scenario + user defaults produce when no
 * explicit override exists, and the value the "Reset" affordance restores.
 */

/** Highest-precedence source allowed to override a key. Mirrors the API's `SettingGroup::SCOPE_*`. */
export type SettingScope = 'user' | 'adventure' | 'scenario';

export type SettingDomain = 'reading' | 'content' | 'play' | 'accessibility';

/** Which widget renders the control. `text-list` is a comma-separated keyword list. */
export type SettingControl = 'select' | 'checkbox' | 'text-list';

export type SettingValue = string | number | boolean | ReadonlyArray<string>;

export interface SettingOptionChoice {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
}

export interface PlayerSettingsGroupDefinition {
  readonly id: string;
  readonly label: string;
  readonly domain: SettingDomain;
  readonly description: string;
  readonly defaultValue: SettingValue;
  /**
   * For enum-style controls the option list. When omitted the renderer
   * falls back to a checkbox / free-text input.
   */
  readonly options?: ReadonlyArray<SettingOptionChoice>;
  /** Which API document carries this key. See the file header. */
  readonly document: 'player-defaults' | 'legacy';
  /** Highest-precedence source allowed to override this key. See the file header. */
  readonly scope: SettingScope;
  /** Whether the scenario engine reads this control. */
  readonly affectsEngine: boolean;
  /** Whether a typography preview is wired to this control. */
  readonly previewable: boolean;
}

const opt = (value: string, label: string, description?: string): SettingOptionChoice =>
  description === undefined ? { value, label } : { value, label, description };

export const PLAYER_SETTINGS_GROUPS: ReadonlyArray<PlayerSettingsGroupDefinition> = [
  {
    id: 'typewriter_mode',
    label: 'Typewriter reveal',
    domain: 'reading',
    description: 'Stream narration token-by-token. Off renders the full beat immediately.',
    defaultValue: true,
    document: 'player-defaults',
    scope: 'user',
    affectsEngine: false,
    previewable: false,
  },
  {
    id: 'theme',
    label: 'Theme',
    domain: 'reading',
    description: 'Light or dark palette. "System" follows your OS preference.',
    defaultValue: 'system',
    options: [opt('light', 'Light'), opt('dark', 'Dark'), opt('system', 'Match system')],
    document: 'player-defaults',
    scope: 'user',
    affectsEngine: false,
    previewable: true,
  },
  {
    // Carried on `PlayerSettingsResource` and in the server's player-defaults
    // allow-list; drives the live typography preview.
    id: 'font_size',
    label: 'Font size',
    domain: 'accessibility',
    description: 'Base narration size. Applies to every surface that renders prose.',
    defaultValue: 'md',
    options: [opt('sm', 'Small'), opt('md', 'Medium'), opt('lg', 'Large')],
    document: 'player-defaults',
    scope: 'user',
    affectsEngine: false,
    previewable: true,
  },
  {
    id: 'reduced_motion',
    label: 'Reduce motion',
    domain: 'accessibility',
    description: 'Render narration and transitions without animation.',
    defaultValue: false,
    document: 'player-defaults',
    scope: 'user',
    affectsEngine: false,
    previewable: true,
  },
  {
    id: 'narration_verbosity',
    label: 'Narration verbosity',
    domain: 'reading',
    description: 'How dense each turn reads. Affects cadence more than plot.',
    defaultValue: 'balanced',
    options: [
      opt('terse', 'Terse', 'Brief beats with room to breathe.'),
      opt('balanced', 'Balanced', 'Default cadence for most scenarios.'),
      opt('rich', 'Rich', 'Slower turns with extra sensory detail.'),
    ],
    document: 'player-defaults',
    scope: 'user',
    affectsEngine: true,
    previewable: true,
  },
  {
    id: 'content_rating',
    label: 'Content rating',
    domain: 'content',
    description: 'Hard ceiling the library respects when filtering scenarios.',
    defaultValue: 'mature',
    options: [
      opt('all-ages', 'All ages'),
      opt('mature', 'Mature'),
      opt('restricted', 'Restricted'),
    ],
    document: 'player-defaults',
    scope: 'scenario',
    affectsEngine: false,
    previewable: false,
  },
  {
    id: 'action_mode',
    label: 'Action mode',
    domain: 'play',
    description: 'How freely the model may mutate world state on your turn.',
    defaultValue: 'guided',
    options: [
      opt('guided', 'Guided', 'The model asks before mutating anything irreversible.'),
      opt('sandbox', 'Sandbox', 'Mutations land freely; undo is always available.'),
      opt('ask', 'Ask mode', 'World state is frozen; the model only describes.'),
    ],
    document: 'player-defaults',
    scope: 'adventure',
    affectsEngine: true,
    previewable: false,
  },
  {
    id: 'world_genre',
    label: 'World genre preference',
    domain: 'content',
    description: 'Library bias. "Any" lets the library decide.',
    defaultValue: 'any',
    options: [
      opt('romance', 'Romance'),
      opt('mystery', 'Mystery'),
      opt('hope', 'Hope'),
      opt('conflict', 'Conflict'),
      opt('any', 'Any'),
    ],
    document: 'player-defaults',
    scope: 'scenario',
    affectsEngine: false,
    previewable: false,
  },
  {
    id: 'language',
    label: 'Narration language',
    domain: 'reading',
    description: 'ISO language code the model narrates in.',
    defaultValue: 'en',
    options: [
      opt('en', 'English'),
      opt('es', 'Español'),
      opt('fr', 'Français'),
      opt('de', 'Deutsch'),
      opt('ja', '日本語'),
    ],
    document: 'player-defaults',
    scope: 'user',
    affectsEngine: true,
    previewable: false,
  },
  {
    id: 'suggested_choices_count',
    label: 'Suggested choices',
    domain: 'play',
    description: 'How many choices appear after each beat. Off renders none.',
    defaultValue: 3,
    options: [opt('2', '2'), opt('3', '3'), opt('4', '4')],
    document: 'player-defaults',
    scope: 'adventure',
    affectsEngine: true,
    previewable: false,
  },
  {
    id: 'dice_visibility',
    label: 'Dice visibility',
    domain: 'play',
    description: 'How the rules engine surfaces rolls. Hidden never shows them.',
    defaultValue: 'summary',
    options: [
      opt('hidden', 'Hidden'),
      opt('summary', 'Summary', 'Show pass / fail only.'),
      opt('detailed', 'Detailed', 'Show the formula and every die.'),
    ],
    document: 'player-defaults',
    scope: 'adventure',
    affectsEngine: true,
    previewable: false,
  },
  {
    id: 'npc_dialogue_density',
    label: 'NPC dialogue density',
    domain: 'play',
    description: 'How much NPCs speak vs. describe.',
    defaultValue: 'natural',
    options: [
      opt('minimal', 'Minimal', 'NPCs rarely speak unless you address them.'),
      opt('natural', 'Natural', 'Default cadence.'),
      opt('verbose', 'Verbose', 'NPCs chatter; descriptions favour dialogue.'),
    ],
    document: 'player-defaults',
    scope: 'scenario',
    affectsEngine: true,
    previewable: false,
  },
  {
    // The only remaining key on the S2 `SettingsResource` document. It is
    // absent from the player-defaults allow-list on the server, so it is the
    // one group the legacy `/api/me/settings` hook still owns.
    id: 'content_warnings',
    label: 'Content warnings',
    domain: 'content',
    description: 'Comma-separated keywords. The scenario editor merges these with its own defaults.',
    defaultValue: [],
    document: 'legacy',
    scope: 'user',
    affectsEngine: false,
    previewable: false,
  },
];

export function findPlayerSettingsGroup(
  id: string,
): PlayerSettingsGroupDefinition | undefined {
  return PLAYER_SETTINGS_GROUPS.find((g) => g.id === id);
}

/**
 * `SettingsResolver` only honours a player default for keys scoped `user` or
 * `adventure`. A `scenario`-scoped key always resolves from the scenario /
 * system default, so a user default for it is inert.
 */
export function isUserWritable(group: PlayerSettingsGroupDefinition): boolean {
  return group.scope !== 'scenario';
}

/** Split a raw control value into the shape this group stores. */
export function coerceSettingValue(
  group: PlayerSettingsGroupDefinition,
  raw: unknown,
): SettingValue {
  if (group.id === 'content_warnings') return parseKeywordList(raw);
  if (typeof group.defaultValue === 'boolean') return Boolean(raw);
  if (typeof group.defaultValue === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : group.defaultValue;
  }
  const text = String(raw);
  if (group.options && !group.options.some((o) => o.value === text)) {
    return String(group.defaultValue);
  }
  return text;
}

export function parseKeywordList(raw: unknown): ReadonlyArray<string> {
  if (Array.isArray(raw)) return raw.map((v) => String(v).trim()).filter((v) => v.length > 0);
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function isInheritedValue(
  group: PlayerSettingsGroupDefinition,
  value: unknown,
): boolean {
  const a = JSON.stringify(sortForCompare(value));
  const b = JSON.stringify(sortForCompare(group.defaultValue));
  return a === b;
}

function sortForCompare(value: unknown): unknown {
  if (Array.isArray(value)) return [...value].map(String).sort();
  return value;
}

/** Render a stored value for display inside a control. */
export function displayValue(group: PlayerSettingsGroupDefinition, value: unknown): string {
  if (group.id === 'content_warnings') return parseKeywordList(value).join(', ');
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value ?? '');
}

export const DOMAIN_ORDER: ReadonlyArray<SettingDomain> = [
  'reading',
  'content',
  'play',
  'accessibility',
];

export const DOMAIN_LABEL: Record<SettingDomain, string> = {
  reading: 'Reading experience',
  content: 'Content & genre',
  play: 'Play mechanics',
  accessibility: 'Accessibility',
};
