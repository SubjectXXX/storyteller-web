/**
 * `<AdventureSettingsDrawer>` — per-adventure settings overrides (S4-T06).
 *
 * Renders one row per setting group with three affordances:
 *   - Inherit (use the user default)
 *   - Override (custom value)
 *   - Reset (scenario default; the locked value when the scenario forbids
 *     overriding a particular control)
 *
 * The drawer fires a live `onChange` callback so the parent can apply the
 * resolved value to its preview surface without waiting for the save
 * mutation to settle.
 */
import type { CSSProperties, ReactElement } from 'react';
import { useId, useMemo, useState } from 'react';
import { Button } from '@/ui/Button';
import { Pill } from '@/ui/Pill';
import { Card } from '@/ui/Card';
import type {
  AdventureSettingGroup,
  AdventureSettingsResource,
  AdventureSettingsUpdateRequest,
  SettingGroupState,
} from '@/api-client';
import { ApiError, type PlayerSettingsResource } from '@/api-client';
import {
  PLAYER_SETTINGS_GROUPS,
  type PlayerSettingsGroupDefinition,
} from './settingsGroups';

export interface AdventureSettingsDrawerProps {
  readonly adventureId: number;
  readonly branchId: number;
  readonly adventureSettings: AdventureSettingsResource | undefined;
  readonly userSettings: PlayerSettingsResource | undefined;
  readonly isLoading: boolean;
  readonly error: ApiError | null;
  readonly onChange?: (groupId: string, value: string | number | boolean) => void;
  readonly onSave: (body: AdventureSettingsUpdateRequest) => void;
  readonly onClose: () => void;
  readonly saving: boolean;
}

const drawerStyle: CSSProperties = {
  position: 'fixed',
  inset: '0',
  background: 'rgba(0,0,0,0.45)',
  display: 'flex',
  justifyContent: 'flex-end',
  zIndex: 500,
};

const panelStyle: CSSProperties = {
  width: 'min(420px, 100vw)',
  height: '100%',
  background: 'var(--color-background)',
  borderLeft: '1px solid var(--color-border)',
  overflowY: 'auto',
  padding: 'var(--space-4) var(--space-5)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gap: 'var(--space-2)',
  alignItems: 'center',
  padding: 'var(--space-2) 0',
  borderBottom: '1px dashed var(--color-border)',
};

const statePillIntent: Record<SettingGroupState, 'success' | 'info' | 'warning' | 'muted'> = {
  inherit: 'muted',
  override: 'info',
  reset: 'warning',
  locked: 'warning',
};

const sourceLabel: Record<AdventureSettingGroup['source'], string> = {
  user: 'Inherited from user defaults',
  adventure: 'Adventure override',
  scenario: 'Scenario default (locked)',
};

const controlStyle: CSSProperties = {
  padding: 'var(--space-1) var(--space-2)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface)',
  color: 'var(--color-foreground)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-sm)',
  minHeight: 'var(--control-touch-min)',
  minWidth: 120,
};

function findGroupDef(id: string): PlayerSettingsGroupDefinition | undefined {
  return PLAYER_SETTINGS_GROUPS.find((g) => g.id === id);
}

function coerce(group: PlayerSettingsGroupDefinition, raw: unknown): string | number | boolean {
  if (typeof group.defaultValue === 'boolean') return Boolean(raw);
  if (typeof group.defaultValue === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : group.defaultValue;
  }
  return String(raw);
}

export function AdventureSettingsDrawer({
  adventureId,
  branchId,
  adventureSettings,
  userSettings,
  isLoading,
  error,
  onChange,
  onSave,
  onClose,
  saving,
}: AdventureSettingsDrawerProps): ReactElement {
  const titleId = useId();
  const [draft, setDraft] = useState<Record<string, { state: SettingGroupState; value: string | number | boolean }>>({});

  // Initialise the draft from the server payload. Use the existing group
  // state so users see the override they previously set.
  useMemo(() => {
    if (!adventureSettings) return;
    const next: typeof draft = {};
    for (const group of adventureSettings.groups) {
      next[group.id] = {
        state: group.state,
        value: group.state === 'override' ? group.value : group.effective_value,
      };
    }
    setDraft(next);
  }, [adventureSettings]);

  const handleInherit = (id: string) => {
    const userValue = userSettings?.[id as keyof PlayerSettingsResource];
    const def = findGroupDef(id);
    const value = userValue ?? def?.defaultValue ?? '';
    setDraft((prev) => ({ ...prev, [id]: { state: 'inherit', value } }));
    onChange?.(id, coerce(def ?? { defaultValue: value } as PlayerSettingsGroupDefinition, value));
  };

  const handleReset = (id: string) => {
    const def = findGroupDef(id);
    const value = def?.defaultValue ?? '';
    setDraft((prev) => ({ ...prev, [id]: { state: 'reset', value } }));
    onChange?.(id, coerce(def ?? { defaultValue: value } as PlayerSettingsGroupDefinition, value));
  };

  const handleOverride = (id: string, value: string | number | boolean) => {
    setDraft((prev) => ({ ...prev, [id]: { state: 'override', value } }));
    onChange?.(id, value);
  };

  const buildBody = (): AdventureSettingsUpdateRequest => {
    const groups = Object.entries(draft).map(([id, entry]) => ({
      id,
      state: entry.state,
      value: entry.state === 'override' ? entry.value : null,
    }));
    return { branch_id: branchId, groups };
  };

  const handleSave = () => onSave(buildBody());

  if (!adventureSettings) {
    return (
      <div style={drawerStyle} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div style={panelStyle}>
          <h2 id={titleId} style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)' }}>
            Adventure settings
          </h2>
          {isLoading ? (
            <p>Loading adventure settings…</p>
          ) : error ? (
            <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>
              {error.message}
            </p>
          ) : (
            <p>No adventure settings available.</p>
          )}
          <Button intent="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={drawerStyle} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div style={panelStyle}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)' }}>
          <h2 id={titleId} style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', margin: 0 }}>
            Adventure settings
          </h2>
          <Button intent="ghost" size="sm" onClick={onClose} aria-label="Close adventure settings drawer">
            Close
          </Button>
        </header>
        <p style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-xs)' }}>
          Adventure #{adventureId} · branch #{branchId}
        </p>
        <Card title="Effective settings" subtitle="What your player will see in this adventure">
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--space-2)' }}>
            {adventureSettings.groups.map((group) => {
              const def = findGroupDef(group.id);
              const entry = draft[group.id] ?? {
                state: group.state,
                value: group.state === 'override' ? group.value : group.effective_value,
              };
              const overridden = entry.state === 'override';
              return (
                <li key={group.id} style={rowStyle} data-testid={`adventure-setting-${group.id}`}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                    <span style={{ fontWeight: 'var(--weight-medium)' }}>{group.label}</span>
                    <span style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-xs)' }}>
                      {group.locked_reason ?? def?.description ?? ''}
                    </span>
                    <Pill intent={statePillIntent[entry.state]} title={`Resolution source: ${sourceLabel[group.source]}`}>
                      {sourceLabel[group.source]}
                    </Pill>
                  </span>
                  <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-1)' }}>
                    <span style={{ display: 'inline-flex', gap: 'var(--space-1)' }}>
                      <Button
                        intent="ghost"
                        size="sm"
                        aria-label={`Inherit ${group.label} from user default`}
                        onClick={() => handleInherit(group.id)}
                        disabled={entry.state === 'inherit'}
                      >
                        Inherit
                      </Button>
                      <Button
                        intent="ghost"
                        size="sm"
                        aria-label={`Reset ${group.label} to scenario default`}
                        onClick={() => handleReset(group.id)}
                      >
                        Reset
                      </Button>
                    </span>
                    {def?.options ? (
                      <select
                        aria-label={`${group.label} override`}
                        value={String(entry.value)}
                        disabled={!overridden}
                        onChange={(event) => handleOverride(group.id, event.target.value)}
                        style={controlStyle}
                      >
                        {def.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="checkbox"
                        aria-label={`${group.label} override`}
                        checked={Boolean(entry.value)}
                        disabled={!overridden}
                        onChange={(event) => handleOverride(group.id, event.target.checked)}
                        style={controlStyle}
                      />
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button intent="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save overrides'}
          </Button>
        </div>
      </div>
    </div>
  );
}