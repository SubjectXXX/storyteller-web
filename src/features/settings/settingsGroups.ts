/**
 * Storyteller player settings group catalogue (S4-T06).
 *
 * Single source of truth for every player-visible setting. Both
 * `UserSettingsPage` and `AdventureSettingsDrawer` read from this list so
 * adding a setting group is a one-file change. The `id` doubles as the
 * wire-format key the API expects (`PlayerSettingsResource.<id>` and
 * `AdventureSettingsResource.groups[i].id`).
 *
 * The `defaultValue` is what the scenario + user defaults produce when no
 * explicit override exists. It is also the value the "Reset" affordance
 * restores on the per-adventure drawer.
 */

export type SettingDomain = 'reading' | 'content' | 'play' | 'accessibility';

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
  readonly defaultValue: string | number | boolean;
  /**
   * For enum-style controls the option list. When omitted the renderer
   * falls back to a checkbox / free-text input.
   */
  readonly options?: ReadonlyArray<SettingOptionChoice>;
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
    affectsEngine: false,
    previewable: false,
  },
  {
    id: 'theme',
    label: 'Theme',
    domain: 'reading',
    description: 'Light or dark palette. "System" follows your OS preference.',
    defaultValue: 'system',
    options: [
      opt('light', 'Light'),
      opt('dark', 'Dark'),
      opt('system', 'Match system'),
    ],
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
    affectsEngine: false,
    previewable: false,
  },
  {
    id: 'language',
    label: 'Narration language',
    domain: 'reading',
    description: 'ISO language code the model narrates in.',
    defaultValue: 'en',
    options: [opt('en', 'English'), opt('es', 'Español'), opt('fr', 'Français'), opt('de', 'Deutsch'), opt('ja', '日本語')],
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
    affectsEngine: true,
    previewable: false,
  },
];

export function findPlayerSettingsGroup(id: string): PlayerSettingsGroupDefinition | undefined {
  return PLAYER_SETTINGS_GROUPS.find((g) => g.id === id);
}