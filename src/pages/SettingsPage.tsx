import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { PageHeader } from '@/ui/PageHeader';
import { Pill } from '@/ui/Pill';
import { Button } from '@/ui/Button';
import { SETTINGS_FIXTURE } from '@/fixtures/data';

export default function SettingsPage(): ReactElement {
  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Preferences & defaults"
        description="Every group below shows the resolved value with a visible indicator when it inherits from your defaults. Real persisted preferences land in S2 once the user-defaults endpoint is shipped."
      />
      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        {SETTINGS_FIXTURE.map((group) => (
          <SettingGroup key={group.id} label={group.label}>
            {group.rows.map((row) => (
              <SettingRow
                key={row.id}
                label={row.label}
                value={row.value}
                inherited={row.inherited}
                locked={row.locked}
                lockedReason={row.lockedReason}
              />
            ))}
          </SettingGroup>
        ))}
      </div>
    </div>
  );
}

function SettingGroup({ label, children }: { label: string; children: ReactNode }): ReactElement {
  return (
    <fieldset
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
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
  label,
  value,
  inherited,
  locked,
  lockedReason,
}: {
  label: string;
  value: string;
  inherited?: boolean;
  locked?: boolean;
  lockedReason?: string;
}): ReactElement {
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
      <span style={{ fontWeight: 'var(--weight-medium)' }}>{label}</span>
      <span style={valueRow}>
        <span style={{ color: 'var(--color-foreground-muted)', fontFamily: 'var(--font-mono)' }}>{value}</span>
        {inherited && (
          <Pill intent="muted" title="Resolved from your default settings">
            Inherited
          </Pill>
        )}
        {locked && <Pill intent="warning" title={lockedReason ?? 'Locked by the active scenario'}>Locked</Pill>}
        <Button intent="ghost" size="sm">
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
