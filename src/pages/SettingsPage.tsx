import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { useState } from 'react';
import { PageHeader } from '@/ui/PageHeader';
import { Pill } from '@/ui/Pill';
import { Button } from '@/ui/Button';
import { LoadingPanel } from '@/components/LoadingPanel';
import { useSettings, useUpdateSettings } from '@/hooks';
import {
  SETTINGS_FIXTURE,
  type SettingGroupFixture,
  type SettingRowFixture,
} from '@/fixtures/data';

export default function SettingsPage(): ReactElement {
  // S2-T01 contract: GET `/api/me/settings` returns the resolved groups;
  // PUT `/api/me/settings` persists edits. The api-client falls back to
  // fixtures so the page renders offline.
  const settingsQuery = useSettings();
  const updateSettings = useUpdateSettings();
  const [draft, setDraft] = useState<ReadonlyArray<SettingGroupFixture> | null>(null);

  const groups: ReadonlyArray<SettingGroupFixture> = settingsQuery.data ?? draft ?? SETTINGS_FIXTURE;

  const handleSave = async () => {
    if (!draft) return;
    try {
      await updateSettings.mutateAsync({ groups: draft });
    } catch (err) {
      // eslint-disable-next-line no-console -- intentional dev signal
      console.warn('[storyteller/web] save settings failed', err);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Preferences & defaults"
        description="Every group below shows the resolved value with a visible indicator when it inherits from your defaults. Edits persist through PUT /api/me/settings."
        actions={
          <Button
            intent="primary"
            onClick={() => void handleSave()}
            disabled={!draft || updateSettings.isPending}
          >
            {updateSettings.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        }
      />

      {settingsQuery.isLoading ? (
        <LoadingPanel label="Loading settings" intent="inline" />
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {updateSettings.error ? (
            <p
              role="alert"
              style={{
                padding: 'var(--space-3) var(--space-4)',
                border: '1px solid var(--color-danger)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-danger)',
                fontSize: 'var(--text-sm)',
              }}
            >
              Save failed: {updateSettings.error.message}
            </p>
          ) : null}
          {groups.map((group) => (
            <SettingGroup key={group.id} label={group.label}>
              {group.rows.map((row) => (
                <SettingRow
                  key={row.id}
                  row={row}
                  onEdit={(next) => {
                    setDraft((prev) => replaceRow(prev ?? groups, group.id, next));
                  }}
                />
              ))}
            </SettingGroup>
          ))}
        </div>
      )}
    </div>
  );
}

function replaceRow(
  source: ReadonlyArray<SettingGroupFixture>,
  groupId: string,
  row: SettingRowFixture,
): ReadonlyArray<SettingGroupFixture> {
  return source.map((g) => {
    if (g.id !== groupId) return g;
    return {
      ...g,
      rows: g.rows.map((r) => (r.id === row.id ? row : r)),
    };
  });
}

function SettingGroup({ label, children }: { label: string; children: ReactNode }): ReactElement {
  return (
    <fieldset
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-4) var(--space-5)',
        background: 'var(--color-surface)',
      }}
    >
      <legend style={{ padding: '0 var(--space-2)', fontWeight: 'var(--weight-medium)' }}>{label}</legend>
      <ul style={{ display: 'grid', gap: 'var(--space-2)', listStyle: 'none', padding: 0, margin: 0 }}>
        {children}
      </ul>
    </fieldset>
  );
}

function SettingRow({
  row,
  onEdit,
}: {
  row: SettingRowFixture;
  onEdit: (row: SettingRowFixture) => void;
}): ReactElement {
  const disabled = row.locked === true;
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-3)',
        padding: 'var(--space-2) var(--space-3)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-surface-muted)',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontWeight: 'var(--weight-medium)' }}>{row.label}</span>
      <span style={valueRow}>
        <span style={{ color: 'var(--color-foreground-muted)', fontFamily: 'var(--font-mono)' }}>{row.value}</span>
        {row.inherited ? (
          <Pill intent="muted" title="Resolved from your default settings">
            Inherited
          </Pill>
        ) : null}
        {row.locked ? <Pill intent="warning" title={row.lockedReason ?? 'Locked by the active scenario'}>Locked</Pill> : null}
        <Button
          intent="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => onEdit({ ...row, value: `${row.value} · edited` })}
        >
          Edit
        </Button>
      </span>
    </li>
  );
}

const valueRow: CSSProperties = {
  display: 'inline-flex',
  gap: 'var(--space-2)',
  alignItems: 'center',
  flexWrap: 'wrap',
};
