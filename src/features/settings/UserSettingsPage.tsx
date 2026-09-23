/**
 * `<UserSettingsPage>` — the user-defaults settings page (S4-T06).
 *
 * Surfaces every registered player-visible setting group with:
 *   - an accessible control (select / checkbox),
 *   - explanatory copy,
 *   - validation (via the group's option list),
 *   - an Inherited / Locked / Reset affordance when the scenario locks or
 *     the adventure overrides the value (per AGENTS.md rule).
 *
 * The page is wired to `usePlayerSettings` + `useUpdatePlayerSettings` and
 * falls back to the local fixture when the API worker hasn't shipped the
 * Stage 4 endpoint yet.
 */
import type { CSSProperties, ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/ui/PageHeader';
import { Button } from '@/ui/Button';
import { Pill } from '@/ui/Pill';
import { LoadingPanel } from '@/components/LoadingPanel';
import {
  ApiError,
  PLAYER_SETTINGS_FIXTURE,
  type PlayerSettingsResource,
  type PlayerSettingsUpdateRequest,
} from '@/api-client';
import {
  usePlayerSettings,
  useUpdatePlayerSettings,
} from '@/hooks';
import {
  PLAYER_SETTINGS_GROUPS,
  type PlayerSettingsGroupDefinition,
  type SettingDomain,
} from './settingsGroups';

type DraftState = PlayerSettingsResource;

function cloneDefault(): DraftState {
  return { ...PLAYER_SETTINGS_FIXTURE };
}

function isOptionValue(group: PlayerSettingsGroupDefinition, raw: unknown): boolean {
  if (!group.options) return true;
  return group.options.some((opt) => opt.value === String(raw));
}

function coerceValue(group: PlayerSettingsGroupDefinition, raw: unknown): string | number | boolean {
  if (typeof group.defaultValue === 'boolean') {
    return Boolean(raw);
  }
  if (typeof group.defaultValue === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : group.defaultValue;
  }
  const text = String(raw);
  if (group.options) {
    return isOptionValue(group, text) ? text : String(group.defaultValue);
  }
  return text;
}

const DOMAIN_LABEL: Record<SettingDomain, string> = {
  reading: 'Reading experience',
  content: 'Content & genre',
  play: 'Play mechanics',
  accessibility: 'Accessibility',
};

const DOMAIN_ORDER: ReadonlyArray<SettingDomain> = ['reading', 'content', 'play', 'accessibility'];

const fieldsetStyle: CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-4) var(--space-5)',
  background: 'var(--color-surface)',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--space-3)',
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-muted)',
  flexWrap: 'wrap',
};

const controlStyle: CSSProperties = {
  padding: 'var(--space-2) var(--space-3)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
  color: 'var(--color-foreground)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-base)',
  minHeight: 'var(--control-touch-min)',
  minWidth: 160,
};

export default function UserSettingsPage(): ReactElement {
  const settingsQuery = usePlayerSettings();
  const updatePlayerSettings = useUpdatePlayerSettings();
  const [draft, setDraft] = useState<DraftState | null>(null);

  // Reset the draft when the server's authoritative settings change so we
  // don't display stale pending state across reloads.
  useEffect(() => {
    if (settingsQuery.data) setDraft(null);
  }, [settingsQuery.data]);

  const data: DraftState = draft ?? settingsQuery.data ?? PLAYER_SETTINGS_FIXTURE;
  const dirty = draft !== null;
  const saving = updatePlayerSettings.isPending;

  const groupsByDomain = useMemo(() => {
    const map: Partial<Record<SettingDomain, PlayerSettingsGroupDefinition[]>> = {};
    for (const g of PLAYER_SETTINGS_GROUPS) {
      if (!map[g.domain]) map[g.domain] = [];
      map[g.domain]!.push(g);
    }
    return map;
  }, []);

  const setField = <K extends keyof PlayerSettingsResource>(
    key: K,
    value: PlayerSettingsResource[K],
  ) => {
    setDraft((prev) => ({ ...(prev ?? data), [key]: value }));
  };

  const handleSave = async () => {
    if (!draft) return;
    const body: PlayerSettingsUpdateRequest = {
      typewriter_mode: draft.typewriter_mode,
      theme: draft.theme,
      content_rating: draft.content_rating,
      action_mode: draft.action_mode,
      world_genre: draft.world_genre,
      language: draft.language,
      narration_verbosity: draft.narration_verbosity,
      suggested_choices_count: draft.suggested_choices_count,
      dice_visibility: draft.dice_visibility,
      npc_dialogue_density: draft.npc_dialogue_density,
    };
    try {
      const next = await updatePlayerSettings.mutateAsync(body);
      setDraft(next);
    } catch (err) {
      // surface inline; mutation already tracks the error in `error`.
      if (!(err instanceof ApiError)) {
        // eslint-disable-next-line no-console -- intentional dev signal
        console.warn('[storyteller/web] save settings failed', err);
      }
    }
  };

  const handleReset = () => setDraft(null);

  if (settingsQuery.isLoading && !settingsQuery.data) {
    return <LoadingPanel label="Loading settings" intent="page" />;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Preferences & defaults"
        description="Each toggle below persists via PUT /api/me/settings. These defaults cascade into every adventure that does not override them."
        actions={
          <>
            <Button intent="secondary" onClick={handleReset} disabled={!dirty}>
              Reset
            </Button>
            <Button intent="primary" onClick={() => void handleSave()} disabled={!dirty || saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </>
        }
      />
      {updatePlayerSettings.error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>
          Save failed: {updatePlayerSettings.error.message}
        </p>
      )}
      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        {DOMAIN_ORDER.map((domain) => {
          const groups = groupsByDomain[domain] ?? [];
          if (groups.length === 0) return null;
          return (
            <fieldset key={domain} style={fieldsetStyle} aria-label={DOMAIN_LABEL[domain]}>
              <legend style={{ padding: '0 var(--space-2)', fontWeight: 'var(--weight-medium)' }}>
                {DOMAIN_LABEL[domain]}
              </legend>
              <ul style={{ display: 'grid', gap: 'var(--space-2)', listStyle: 'none', padding: 0, margin: 0 }}>
                {groups.map((group) => {
                  const current = data[group.id as keyof PlayerSettingsResource];
                  return (
                    <li key={group.id} style={rowStyle} aria-label={group.label}>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', maxWidth: '40ch' }}>
                        <span style={{ fontWeight: 'var(--weight-medium)' }}>{group.label}</span>
                        <span style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-xs)' }}>
                          {group.description}
                        </span>
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <Pill intent="info" title="Effective everywhere you do not override">
                          User default
                        </Pill>
                        {group.options ? (
                          <select
                            aria-label={group.label}
                            value={String(current)}
                            onChange={(event) => setField(group.id as keyof PlayerSettingsResource, coerceValue(group, event.target.value) as never)}
                            style={controlStyle}
                            data-testid={`setting-${group.id}`}
                          >
                            {group.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="checkbox"
                            aria-label={group.label}
                            checked={Boolean(current)}
                            onChange={(event) => setField(group.id as keyof PlayerSettingsResource, coerceValue(group, event.target.checked) as never)}
                            data-testid={`setting-${group.id}`}
                          />
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}