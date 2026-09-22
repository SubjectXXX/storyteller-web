import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { useState } from 'react';
import { PageHeader } from '@/ui/PageHeader';
import { Button } from '@/ui/Button';
import { LoadingPanel } from '@/components/LoadingPanel';
import { useSettings, useUpdateSettings } from '@/hooks';
import {
  SETTINGS_RESOURCE_FIXTURE,
  type SettingsResource,
} from '@/fixtures/data';

type Theme = SettingsResource['theme'];
type FontSize = SettingsResource['font_size'];

export default function SettingsPage(): ReactElement {
  const settingsQuery = useSettings();
  const updateSettings = useUpdateSettings();
  const [draft, setDraft] = useState<SettingsResource | null>(null);

  const current: SettingsResource = settingsQuery.data ?? draft ?? SETTINGS_RESOURCE_FIXTURE;
  const dirty = draft !== null && draft !== settingsQuery.data;

  const setField = <K extends keyof SettingsResource>(key: K, value: SettingsResource[K]) => {
    setDraft((prev) => {
      const base = prev ?? current;
      return { ...base, [key]: value };
    });
  };

  const handleSave = async () => {
    if (!draft) return;
    try {
      const next = await updateSettings.mutateAsync({
        theme: draft.theme,
        font_size: draft.font_size,
        reduced_motion: draft.reduced_motion,
        typewriter_mode: draft.typewriter_mode,
        content_warnings: draft.content_warnings,
      });
      setDraft(next);
    } catch (err) {
      // eslint-disable-next-line no-console -- intentional dev signal
      console.warn('[storyteller/web] save settings failed', err);
    }
  };

  const handleReset = () => {
    setDraft(null);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Preferences & defaults"
        description="Each toggle below persists via PUT /api/me/settings. Settings are scoped per user — admins override defaults, not your individual choices."
        actions={
          <>
            <Button
              intent="secondary"
              onClick={handleReset}
              disabled={!dirty}
            >
              Reset
            </Button>
            <Button
              intent="primary"
              onClick={() => void handleSave()}
              disabled={!dirty || updateSettings.isPending}
            >
              {updateSettings.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </>
        }
      />

      {settingsQuery.isLoading ? (
        <LoadingPanel label="Loading settings" intent="inline" />
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {updateSettings.error && (
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
          )}

          <SettingGroup label="Reading experience">
            <Row label="Theme">
              <select
                aria-label="Theme"
                value={current.theme}
                onChange={(event) => setField('theme', event.target.value as Theme)}
                style={controlStyle}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </Row>
            <Row label="Font size">
              <select
                aria-label="Font size"
                value={current.font_size}
                onChange={(event) => setField('font_size', event.target.value as FontSize)}
                style={controlStyle}
              >
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
              </select>
            </Row>
            <Row label="Typewriter mode">
              <input
                type="checkbox"
                checked={current.typewriter_mode}
                onChange={(event) => setField('typewriter_mode', event.target.checked)}
                aria-label="Typewriter mode"
              />
            </Row>
            <Row label="Reduce motion">
              <input
                type="checkbox"
                checked={current.reduced_motion}
                onChange={(event) => setField('reduced_motion', event.target.checked)}
                aria-label="Reduce motion"
              />
            </Row>
          </SettingGroup>

          <SettingGroup label="Content warnings">
            <Row label="Warnings">
              <input
                type="text"
                value={current.content_warnings.join(', ')}
                onChange={(event) =>
                  setField(
                    'content_warnings',
                    event.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter((s) => s.length > 0),
                  )
                }
                placeholder="violence, grief"
                style={controlStyle}
                aria-label="Content warnings"
              />
            </Row>
            <span style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-xs)' }}>
              Comma-separated keywords; the scenario editor merges these with its own defaults.
            </span>
          </SettingGroup>
        </div>
      )}
    </div>
  );
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

function Row({ label, children }: { label: string; children: ReactNode }): ReactElement {
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
      <span style={valueRow}>{children}</span>
    </li>
  );
}

const valueRow: CSSProperties = {
  display: 'inline-flex',
  gap: 'var(--space-2)',
  alignItems: 'center',
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
