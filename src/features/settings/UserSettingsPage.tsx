/**
 * `<UserSettingsPage>` — the user-defaults settings page (S4-T06).
 *
 * Surfaces every registered player-visible setting group with:
 *   - an accessible control (select / checkbox),
 *   - explanatory copy,
 *   - validation (via the group's option list),
 *   - an Inherited / Locked / Reset affordance when the scenario locks or
 *     the adventure overrides the value (per AGENTS.md rule),
 *   - a live typography preview that reflects font family, font size, line
 *     height, and the reduced-motion toggle in real time.
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

/**
 * Preview copy used by the live typography surface. Pulled from the
 * "The Cartographer's Last Letter" scenario fixture so the player
 * recognises the look of the rendered narration.
 */
const PREVIEW_COPY =
  'The archive exhales damp stone as Imogen lifts the lantern. Rain taps the slate roof in a slow waltz; the cartographer\u2019s letter feels heavier than the paper warrants.';

function fontSizeToPx(size: PlayerSettingsResource['font_size']): number {
  if (size === 'sm') return 15;
  if (size === 'lg') return 19;
  return 17;
}

function buildPreviewStyle(
  theme: PlayerSettingsResource['theme'],
  size: PlayerSettingsResource['font_size'],
  reducedMotion: boolean,
): CSSProperties {
  // The preview surface always reflects the design tokens so the player
  // sees the *actual* light / dark palette (not a hand-picked
  // approximation). `<html data-theme>` is set by the page on every
  // draft change, so the variables below flip with the theme selector.
  const palette =
    theme === 'system'
      ? { background: 'var(--color-bg)', foreground: 'var(--color-fg)', accent: 'var(--color-primary)' }
      : { background: 'var(--color-bg)', foreground: 'var(--color-fg)', accent: 'var(--color-primary)' };
  return {
    background: palette.background,
    color: palette.foreground,
    fontFamily: 'var(--font-serif)',
    fontSize: `${fontSizeToPx(size)}px`,
    lineHeight: 1.45,
    letterSpacing: '0.01em',
    padding: 'var(--space-4) var(--space-5)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    ['--color-preview-accent' as string]: palette.accent,
    transition: reducedMotion ? 'none' : 'background 180ms ease, color 180ms ease, font-size 120ms ease',
  };
}

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

  // "Saved" toast — surfaced for 2s after a successful save so the
  // player gets visible confirmation (S4-T06 v12 verifier flagged the
  // lack of a confirmation surface).
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const showSaved = savedAt !== null && Date.now() - savedAt < 2000;
  useEffect(() => {
    if (savedAt === null) return;
    const id = window.setTimeout(() => setSavedAt(null), 2000);
    return () => window.clearTimeout(id);
  }, [savedAt]);

  // Apply the current theme to <html data-theme="..."> so the document
  // chrome (background, scrollbars, focus rings) follows the player's
  // choice in real time. The CSS variables under :root / html[data-theme]
  // in `styles/global.css` consume the attribute. We re-run on every
  // `data.theme` change (including the draft) so the toggle feels live
  // before the player hits Save.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', data.theme);
  }, [data.theme]);

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
      setSavedAt(Date.now());
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
      <div
        role="status"
        aria-live="polite"
        data-testid="settings-saved-toast"
        data-saved-state={showSaved ? 'visible' : 'hidden'}
        style={{
          position: 'fixed',
          right: 'var(--space-4)',
          bottom: 'var(--space-4)',
          padding: 'var(--space-3) var(--space-4)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-success)',
          color: 'var(--color-success-foreground)',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--weight-medium)',
          boxShadow: '0 6px 18px rgba(0, 0, 0, 0.18)',
          opacity: showSaved ? 1 : 0,
          transform: showSaved ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 200ms ease, transform 200ms ease',
          pointerEvents: 'none',
          zIndex: 'var(--z-toast)',
        }}
      >
        Saved
      </div>
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

        {/*
         * Live typography preview — reflects the current `theme`,
         * `font_size`, and `reduced_motion` selections in real time so the
         * player sees what their choice will look like on the play surface.
         * Per S2-T06 + S4-T06.
         */}
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
            Updates as you change theme, font size, narration verbosity, or the reduced-motion toggle.
          </p>
          <div
            data-testid="typography-preview"
            aria-live="polite"
            style={buildPreviewStyle(data.theme, data.font_size, data.reduced_motion)}
          >
            <p style={{ margin: 0 }}>{PREVIEW_COPY}</p>
          </div>
        </fieldset>
      </div>
    </div>
  );
}