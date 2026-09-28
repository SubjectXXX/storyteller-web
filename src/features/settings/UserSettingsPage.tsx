/**
 * `<UserSettingsPage>` — the GLOBAL-scope settings surface (routed at
 * `/settings`).
 *
 * Renders every group in the single catalogue (`./settingsGroups`) through
 * the shared `<SettingsGroupRow>`, so this page and the per-adventure
 * `<AdventureSettingsDrawer>` cannot drift apart. Each row surfaces the
 * Inherited / Locked / Reset affordance required by `AGENTS.md`.
 *
 * Two documents back the catalogue, so two hooks are wired (one per real
 * capability — the API models them as separate endpoints with separate
 * allow-lists):
 *
 *   - `usePlayerSettings` → `GET/PUT /api/me/settings/player-defaults`
 *     for every `document: 'player-defaults'` group.
 *   - `useSettings`       → `GET/PUT /api/me/settings` for the one
 *     `document: 'legacy'` group (`content_warnings`), which the server's
 *     player-defaults allow-list does not accept.
 */
import type { CSSProperties, ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/ui/PageHeader';
import { Button } from '@/ui/Button';
import { LoadingPanel } from '@/components/LoadingPanel';
import { ApiError, PLAYER_SETTINGS_FIXTURE } from '@/api-client';
import { SETTINGS_RESOURCE_FIXTURE } from '@/fixtures/data';
import { usePlayerSettings, useUpdatePlayerSettings } from '@/hooks';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { SettingsGroupRow } from './SettingsGroupRow';
import {
  DOMAIN_LABEL,
  DOMAIN_ORDER,
  PLAYER_SETTINGS_GROUPS,
  isInheritedValue,
  isUserWritable,
  type PlayerSettingsGroupDefinition,
  type SettingDomain,
  type SettingValue,
} from './settingsGroups';

/** Draft is keyed by group id so one map serves every group regardless of document. */
type Draft = Readonly<Record<string, SettingValue>>;

const fieldsetStyle: CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-4) var(--space-5)',
  background: 'var(--color-surface)',
};

const listStyle: CSSProperties = {
  display: 'grid',
  gap: 'var(--space-2)',
  listStyle: 'none',
  padding: 0,
  margin: 0,
};

/**
 * Preview copy used by the live typography surface, so the player recognises
 * the look of the rendered narration before saving.
 */
const PREVIEW_COPY =
  'The archive exhales damp stone as Imogen lifts the lantern. Rain taps the slate roof in a slow waltz; the cartographer\u2019s letter feels heavier than the paper warrants.';

/** Looked up once; the catalogue is static so these always resolve. */
const themeGroup = PLAYER_SETTINGS_GROUPS.find((g) => g.id === 'theme')!;
const fontSizeGroup = PLAYER_SETTINGS_GROUPS.find((g) => g.id === 'font_size')!;
const reducedMotionGroup = PLAYER_SETTINGS_GROUPS.find((g) => g.id === 'reduced_motion')!;

function fontSizeToPx(size: string): number {
  if (size === 'sm') return 15;
  if (size === 'lg') return 19;
  return 17;
}

function buildPreviewStyle(
  theme: string,
  size: string,
  reducedMotion: boolean,
): CSSProperties {
  return {
    background: 'var(--color-bg)',
    color: 'var(--color-fg)',
    fontFamily: 'var(--font-serif)',
    fontSize: `${fontSizeToPx(size)}px`,
    lineHeight: 1.45,
    letterSpacing: '0.01em',
    padding: 'var(--space-4) var(--space-5)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    transition: reducedMotion ? 'none' : 'background 180ms ease, color 180ms ease, font-size 120ms ease',
  };
}

export default function UserSettingsPage(): ReactElement {
  const playerQuery = usePlayerSettings();
  const legacyQuery = useSettings();
  const updatePlayer = useUpdatePlayerSettings();
  const updateLegacy = useUpdateSettings();
  const [draft, setDraft] = useState<Draft | null>(null);

  // Drop the draft when either authoritative document changes so pending
  // state never survives a refetch.
  useEffect(() => {
    setDraft(null);
  }, [playerQuery.data, legacyQuery.data]);

  const groupsByDomain = useMemo(() => {
    const map: Partial<Record<SettingDomain, PlayerSettingsGroupDefinition[]>> = {};
    for (const group of PLAYER_SETTINGS_GROUPS) {
      if (!map[group.domain]) map[group.domain] = [];
      map[group.domain]!.push(group);
    }
    return map;
  }, []);

  /**
   * Resolve the live value for a group: draft override, else the owning
   * document's payload, else the catalogue default.
   */
  const valueOf = (group: PlayerSettingsGroupDefinition): SettingValue => {
    if (draft && group.id in draft) return draft[group.id] as SettingValue;
    if (group.document === 'legacy') {
      const legacy = legacyQuery.data as Record<string, SettingValue> | undefined;
      if (legacy && group.id in legacy) return legacy[group.id] as SettingValue;
      return (SETTINGS_RESOURCE_FIXTURE as unknown as Record<string, SettingValue>)[
        group.id
      ] ?? group.defaultValue;
    }
    const player = playerQuery.data as unknown as Record<string, SettingValue> | undefined;
    if (player && group.id in player) return player[group.id] as SettingValue;
    return (PLAYER_SETTINGS_FIXTURE as unknown as Record<string, SettingValue>)[
      group.id
    ] ?? group.defaultValue;
  };

  const dirty = draft !== null;
  const saving = updatePlayer.isPending || updateLegacy.isPending;

  const setField = (group: PlayerSettingsGroupDefinition, value: SettingValue) => {
    setDraft((prev) => ({ ...(prev ?? {}), [group.id]: value }));
  };

  /** Reset restores the catalogue default for that group. */
  const handleResetGroup = (group: PlayerSettingsGroupDefinition) => {
    setDraft((prev) => ({ ...(prev ?? {}), [group.id]: group.defaultValue }));
  };

  const handleResetAll = () => setDraft(null);

  const handleSave = async () => {
    if (!draft) return;
    // Partition the draft by owning document so each hook PUTs only the keys
    // its endpoint accepts.
    const playerPatch: Record<string, SettingValue> = {};
    const legacyPatch: Record<string, SettingValue> = {};
    for (const group of PLAYER_SETTINGS_GROUPS) {
      if (!(group.id in draft)) continue;
      if (group.document === 'legacy') legacyPatch[group.id] = draft[group.id] as SettingValue;
      else playerPatch[group.id] = draft[group.id] as SettingValue;
    }
    try {
      if (Object.keys(playerPatch).length > 0) {
        await updatePlayer.mutateAsync(playerPatch as never);
      }
      if (Object.keys(legacyPatch).length > 0) {
        await updateLegacy.mutateAsync(legacyPatch as never);
      }
      setDraft(null);
    } catch (err) {
      // Surfaced inline; both mutations already track their own `error`.
      if (!(err instanceof ApiError)) {
        // eslint-disable-next-line no-console -- intentional dev signal
        console.warn('[storyteller/web] save settings failed', err);
      }
    }
  };

  const error = updatePlayer.error ?? updateLegacy.error;

  // Preview inputs are catalogue groups, so they resolve through `valueOf`
  // and honour the draft like every other row.
  const theme = String(valueOf(themeGroup));
  const fontSize = String(valueOf(fontSizeGroup));
  const motion = Boolean(valueOf(reducedMotionGroup));

  // Apply the current theme to <html data-theme> so the document chrome
  // follows the player's choice live, draft included.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  if (playerQuery.isLoading && !playerQuery.data) {
    return <LoadingPanel label="Loading settings" intent="page" />;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Preferences & defaults"
        description="These are your global defaults. Every adventure that does not override them inherits these values; Reset restores the inherited default for a single group."
        actions={
          <>
            <Button intent="secondary" onClick={handleResetAll} disabled={!dirty}>
              Reset all
            </Button>
            <Button intent="primary" onClick={() => void handleSave()} disabled={!dirty || saving}>
              {saving ? 'Saving\u2026' : 'Save changes'}
            </Button>
          </>
        }
      />

      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>
          Save failed: {error.message}
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
              <ul style={listStyle}>
                {groups.map((group) => {
                  const value = valueOf(group);
                  const inherited = isInheritedValue(group, value);
                  return (
                    <SettingsGroupRow
                      key={group.id}
                      group={group}
                      value={value}
                      inherited={inherited}
                      // Scenario-scoped keys resolve from the scenario /
                      // system default, so a user default for them is inert.
                      locked={!isUserWritable(group)}
                      onChange={(next) => setField(group, next)}
                      onReset={() => handleResetGroup(group)}
                    />
                  );
                })}
              </ul>
            </fieldset>
          );
        })}

        <fieldset
          style={fieldsetStyle}
          aria-label="Live typography preview"
          aria-describedby="typography-preview-help"
        >
          <legend style={{ padding: '0 var(--space-2)', fontWeight: 'var(--weight-medium)' }}>
            Live typography preview
          </legend>
          <p
            id="typography-preview-help"
            style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-xs)', margin: '0 0 var(--space-3) 0' }}
          >
            Updates as you change theme or narration verbosity.
          </p>
          <div
            data-testid="typography-preview"
            aria-live="polite"
            style={buildPreviewStyle(theme, fontSize, motion)}
          >
            <p style={{ margin: 0 }}>{PREVIEW_COPY}</p>
          </div>
        </fieldset>
      </div>
    </div>
  );
}
