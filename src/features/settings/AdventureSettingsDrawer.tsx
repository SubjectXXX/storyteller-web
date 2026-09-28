/**
 * `<AdventureSettingsDrawer>` — the per-adventure settings surface.
 *
 * Legitimately a different *surface* from `<UserSettingsPage>` (adventure
 * scope vs. global scope) but not a different *model*: both render from the
 * single catalogue in `./settingsGroups` through `<SettingsGroupRow>`, so
 * the Inherited / Locked / Reset affordance is implemented once.
 *
 * The row set is server-driven — `AdventureSettingsResource.groups` is the
 * resolver's output — so this surface can show a `state` / `source` /
 * `locked_reason` the catalogue does not know about. A locked group renders
 * its control disabled with the server's reason; the player is not offered
 * an edit that the server would reject.
 */
import type { CSSProperties, ReactElement } from 'react';
import { useId, useMemo, useState } from 'react';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import type {
  AdventureSettingGroup,
  AdventureSettingsResource,
  AdventureSettingsUpdateRequest,
  SettingGroupState,
} from '@/api-client';
import { ApiError } from '@/api-client';
import { SettingsGroupRow } from './SettingsGroupRow';
import {
  coerceSettingValue,
  findPlayerSettingsGroup,
  isInheritedValue,
  type PlayerSettingsGroupDefinition,
  type SettingValue,
} from './settingsGroups';

export interface AdventureSettingsDrawerProps {
  readonly adventureId: number;
  readonly branchId: number;
  readonly adventureSettings: AdventureSettingsResource | undefined;
  readonly userSettings: Record<string, SettingValue> | undefined;
  readonly isLoading: boolean;
  readonly error: ApiError | null;
  readonly onChange?: (groupId: string, value: SettingValue) => void;
  readonly onSave: (body: AdventureSettingsUpdateRequest) => void;
  readonly onClose: () => void;
  readonly saving: boolean;
}

type DraftEntry = { state: SettingGroupState; value: SettingValue };
type Draft = Readonly<Record<string, DraftEntry>>;

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

const listStyle: CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'grid',
  gap: 'var(--space-2)',
};

const sourceLabel: Record<AdventureSettingGroup['source'], string> = {
  user: 'Inherited from user defaults',
  adventure: 'Adventure override',
  scenario: 'Scenario default',
};

/**
 * A server group with no catalogue entry still needs a definition to render
 * from. Synthesise one from the server's own label / options so an unknown
 * key degrades to a read-only row rather than crashing the drawer.
 */
function definitionFor(group: AdventureSettingGroup): PlayerSettingsGroupDefinition {
  const known = findPlayerSettingsGroup(group.id);
  if (known) return known;
  return {
    id: group.id,
    label: group.label,
    domain: 'play',
    description: '',
    defaultValue: group.effective_value,
    options: group.options?.map((value) => ({ value, label: value })),
    document: 'player-defaults',
    scope: 'user',
    affectsEngine: false,
    previewable: false,
  };
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
  const [draft, setDraft] = useState<Draft>({});

  // Initialise the draft from the server payload so users see the override
  // they previously set.
  //
  // R23b P0-1: a partial server payload can omit `groups` (loading state,
  // 404 fallback, optimistic update in flight). Iterating undefined throws
  // `groups is not iterable` and unmounts the page via the ErrorBoundary.
  useMemo(() => {
    if (!adventureSettings) return;
    const groups = adventureSettings.groups ?? [];
    if (groups.length === 0) {
      // Don't clobber the local draft with an empty server payload — the
      // selector can fire before the real payload arrives.
      return;
    }
    const next: Record<string, DraftEntry> = {};
    for (const group of groups) {
      const value: SettingValue =
        group.state === 'override' && group.value !== null
          ? (group.value as SettingValue)
          : (group.effective_value as SettingValue);
      next[group.id] = { state: group.state, value };
    }
    setDraft(next);
  }, [adventureSettings]);

  const handleInherit = (group: PlayerSettingsGroupDefinition) => {
    const userValue = userSettings?.[group.id];
    const value = userValue ?? group.defaultValue;
    setDraft((prev) => ({ ...prev, [group.id]: { state: 'inherit', value } }));
    onChange?.(group.id, coerceSettingValue(group, value));
  };

  const handleReset = (group: PlayerSettingsGroupDefinition) => {
    setDraft((prev) => ({ ...prev, [group.id]: { state: 'reset', value: group.defaultValue } }));
    onChange?.(group.id, coerceSettingValue(group, group.defaultValue));
  };

  const handleOverride = (group: PlayerSettingsGroupDefinition, value: SettingValue) => {
    setDraft((prev) => ({ ...prev, [group.id]: { state: 'override', value } }));
    onChange?.(group.id, value);
  };

  const buildBody = (): AdventureSettingsUpdateRequest => ({
    branch_id: branchId,
    groups: Object.entries(draft).map(([id, entry]) => ({
      id,
      state: entry.state,
      value: entry.state === 'override' ? entry.value : null,
    })),
  });

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
        <header
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)' }}
        >
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
          <ul style={listStyle}>
            {(adventureSettings.groups ?? []).map((serverGroup) => {
              const def = definitionFor(serverGroup);
              const entry = draft[serverGroup.id] ?? {
                state: serverGroup.state,
                value:
                  serverGroup.state === 'override'
                    ? (serverGroup.value as SettingValue)
                    : (serverGroup.effective_value as SettingValue),
              };
              const locked = serverGroup.state === 'locked';
              const overridden = entry.state === 'override';

              return (
                <SettingsGroupRow
                  key={serverGroup.id}
                  group={def}
                  value={entry.value}
                  inherited={!overridden || isInheritedValue(def, entry.value)}
                  locked={locked}
                  lockedReason={serverGroup.locked_reason}
                  stateLabel={sourceLabel[serverGroup.source]}
                  stateIntent={overridden ? 'info' : 'muted'}
                  controlEditable={!locked}
                  onChange={(value) => handleOverride(def, value)}
                  onReset={() => handleReset(def)}
                  actions={
                    <>
                      <Button
                        intent="ghost"
                        size="sm"
                        aria-label={`Override ${def.label} for this adventure only`}
                        onClick={() => handleOverride(def, entry.value)}
                        disabled={overridden || locked}
                      >
                        Override
                      </Button>
                      <Button
                        intent="ghost"
                        size="sm"
                        aria-label={`Inherit ${def.label} from user default`}
                        onClick={() => handleInherit(def)}
                        disabled={entry.state === 'inherit' || locked}
                      >
                        Inherit
                      </Button>
                    </>
                  }
                />
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
