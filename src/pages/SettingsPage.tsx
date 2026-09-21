import type { ReactElement, ReactNode } from "react";
/**
 * Setting groups preview (S1 fixture). Real persisted preferences land
 * in S2 once the user-defaults endpoint is shipped.
 */
export default function SettingsPage(): ReactElement {
  return (
    <section aria-labelledby="settings" style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <h1 id="settings" style={{ fontSize: 'var(--text-2xl)' }}>
        Settings & preferences
      </h1>
      <p style={{ color: 'var(--color-foreground-muted)' }}>
        The full settings panel arrives in S2. Below is the preview of
        every group that will be available, with a visible “Inherited
        from your defaults” indicator and a Reset control.
      </p>
      <SettingGroup label="Infinite narrative & memory">
        <SettingRow label="Context window" value="30 turns" inherited />
        <SettingRow label="Auto-summarize" value="On" inherited />
        <SettingRow label="Chronicle max entries" value="60" inherited />
      </SettingGroup>
      <SettingGroup label="Reading typography">
        <SettingRow label="Typewriter" value="18 ms/char" />
        <SettingRow label="Reduce motion" value="Off" />
        <SettingRow label="Font family" value="Inter" />
      </SettingGroup>
      <SettingGroup label="Physical needs & survival">
        <SettingRow label="Hunger" value="Locked — not supported by current scenario" locked />
        <SettingRow label="Sleep" value="Off" />
      </SettingGroup>
    </section>
  );
}

function SettingGroup({ label, children }: { label: string; children: ReactNode }): ReactElement {
  return (
    <fieldset
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        background: 'var(--color-surface)',
      }}
    >
      <legend style={{ padding: '0 var(--space-2)', fontWeight: 500 }}>{label}</legend>
      <ul style={{ display: 'grid', gap: 'var(--space-2)' }}>{children}</ul>
    </fieldset>
  );
}

function SettingRow({
  label,
  value,
  inherited = false,
  locked = false,
}: {
  label: string;
  value: string;
  inherited?: boolean;
  locked?: boolean;
}): ReactElement {
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-2) var(--space-3)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-surface-muted)',
      }}
    >
      <span>{label}</span>
      <span style={{ display: 'inline-flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <span style={{ color: 'var(--color-foreground-muted)' }}>{value}</span>
        {inherited && (
          <span style={tagStyle('muted')}>
            Inherited from your defaults
          </span>
        )}
        {locked && (
          <span style={tagStyle('warning')}>
            Locked
          </span>
        )}
      </span>
    </li>
  );
}

function tagStyle(intent: 'muted' | 'warning'): React.CSSProperties {
  if (intent === 'muted') {
    return {
      fontSize: 'var(--text-xs)',
      padding: '2px var(--space-2)',
      borderRadius: 'var(--radius-full)',
      background: 'var(--color-surface)',
      color: 'var(--color-foreground-muted)',
      border: '1px solid var(--color-border)',
    };
  }
  return {
    fontSize: 'var(--text-xs)',
    padding: '2px var(--space-2)',
    borderRadius: 'var(--radius-full)',
    background: 'var(--color-warning)',
    color: 'var(--color-warning-foreground)',
  };
}
