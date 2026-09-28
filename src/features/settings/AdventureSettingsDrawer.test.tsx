import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  ADVENTURE_SETTINGS_FIXTURE,
  ApiError,
  PLAYER_SETTINGS_FIXTURE,
  type AdventureSettingsResource,
  type SettingGroupState,
} from '@/api-client';
import { AdventureSettingsDrawer } from './AdventureSettingsDrawer';
import { PLAYER_SETTINGS_GROUPS, findPlayerSettingsGroup } from './settingsGroups';

const LOCKED_ID = 'language';

function renderDrawer(
  overrides: Partial<React.ComponentProps<typeof AdventureSettingsDrawer>> = {},
) {
  const props = {
    adventureId: ADVENTURE_SETTINGS_FIXTURE.adventure_id,
    branchId: ADVENTURE_SETTINGS_FIXTURE.branch_id,
    adventureSettings: ADVENTURE_SETTINGS_FIXTURE,
    userSettings: PLAYER_SETTINGS_FIXTURE as unknown as Record<string, never>,
    isLoading: false,
    error: null,
    onSave: () => undefined,
    onClose: () => undefined,
    saving: false,
    ...overrides,
  };
  return { props, ...render(<AdventureSettingsDrawer {...props} />) };
}

describe('AdventureSettingsDrawer', () => {
  it('renders one row per resolved group, drawn from the canonical catalogue', () => {
    renderDrawer();
    expect(screen.getByRole('dialog', { name: /adventure settings/i })).toBeTruthy();
    for (const group of ADVENTURE_SETTINGS_FIXTURE.groups) {
      expect(screen.getByTestId(`setting-row-${group.id}`)).toBeTruthy();
    }
    // Every server group id resolves against the one catalogue.
    for (const group of ADVENTURE_SETTINGS_FIXTURE.groups) {
      expect(findPlayerSettingsGroup(group.id)).toBeDefined();
    }
    expect(screen.getAllByText(/inherited from user defaults|adventure override|scenario default/i)
      .length).toBeGreaterThan(0);
  });

  it('invokes onSave with the built update body', () => {
    const onSave = vi.fn();
    renderDrawer({ onSave });
    fireEvent.click(screen.getByRole('button', { name: /save overrides/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const body = onSave.mock.calls[0]?.[0];
    expect(body).toMatchObject({ branch_id: ADVENTURE_SETTINGS_FIXTURE.branch_id });
    expect(Array.isArray(body?.groups)).toBe(true);
  });

  it('streams live changes via onChange', () => {
    const onChange = vi.fn();
    renderDrawer({ onChange });
    // `typewriter_mode` ships inherited, so Override is the enabled action.
    fireEvent.click(screen.getByRole('button', { name: /override typewriter reveal/i }));
    expect(onChange).toHaveBeenCalledWith('typewriter_mode', true);
  });

  it('renders a server-locked group as locked, not as an editable control', () => {
    renderDrawer();
    const row = screen.getByTestId(`setting-row-${LOCKED_ID}`);
    expect(row.getAttribute('data-locked')).toBe('true');
    expect(row.getAttribute('data-editable')).toBe('false');

    // The control and every mutating affordance must be inert.
    const control = screen.getByTestId(`setting-${LOCKED_ID}`);
    expect(control.hasAttribute('disabled')).toBe(true);
    expect(
      screen.getByRole('button', { name: new RegExp(`override .*${LOCKED_ID.replace('_', ' ')}`, 'i') })
        .hasAttribute('disabled'),
    ).toBe(true);
    expect(
      screen.getByRole('button', { name: new RegExp(`inherit .*${LOCKED_ID.replace('_', ' ')}`, 'i') })
        .hasAttribute('disabled'),
    ).toBe(true);
    expect(
      screen.getByTestId(`setting-reset-${LOCKED_ID}`).hasAttribute('disabled'),
    ).toBe(true);
    expect(screen.getByTestId(`setting-locked-${LOCKED_ID}`)).toBeTruthy();
  });

  it('Reset restores the inherited default for a single overridden group', () => {
    const onChange = vi.fn();
    renderDrawer({ onChange });

    const verbosity = findPlayerSettingsGroup('narration_verbosity')!;
    // The fixture ships this group overridden to `rich`.
    expect(screen.getByTestId('setting-row-narration_verbosity').getAttribute('data-inherited'))
      .toBe('false');

    fireEvent.click(screen.getByTestId('setting-reset-narration_verbosity'));

    expect(onChange).toHaveBeenCalledWith('narration_verbosity', verbosity.defaultValue);
    expect(
      (screen.getByTestId('setting-narration_verbosity') as HTMLSelectElement).value,
    ).toBe('balanced');
    expect(screen.getByTestId('setting-row-narration_verbosity').getAttribute('data-inherited'))
      .toBe('true');
  });

  it('renders a loading skeleton when the query is pending and no data is present', () => {
    renderDrawer({ adventureSettings: undefined, userSettings: undefined, isLoading: true });
    expect(screen.getByText(/loading adventure settings/i)).toBeTruthy();
  });

  it('renders an error message when the API returned an error', () => {
    const error = new ApiError(500, { message: 'Adventure settings offline', code: 'offline' });
    const onClose = vi.fn();
    renderDrawer({ adventureSettings: undefined, userSettings: undefined, error, onClose });
    expect(screen.getByRole('alert').textContent).toMatch(/offline/i);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  // R23b P0-1: a partial server payload (loading state, optimistic update,
  // or a 404 fallback) can omit the `groups` field. Iterating undefined used
  // to throw `groups is not iterable` and unmount the page via the
  // ErrorBoundary.
  it('renders without crashing when adventureSettings.groups is undefined', () => {
    const partial = {
      ...ADVENTURE_SETTINGS_FIXTURE,
      groups: undefined as unknown as AdventureSettingsResource['groups'],
    };
    expect(() =>
      render(
        <AdventureSettingsDrawer
          adventureId={partial.adventure_id}
          branchId={partial.branch_id}
          adventureSettings={partial}
          userSettings={PLAYER_SETTINGS_FIXTURE as unknown as Record<string, never>}
          isLoading={false}
          error={null}
          onSave={() => undefined}
          onClose={() => undefined}
          saving={false}
        />,
      ),
    ).not.toThrow();
    expect(screen.getByRole('dialog', { name: /adventure settings/i })).toBeTruthy();
  });

  it('degrades an unknown server group to a rendered row rather than a crash', () => {
    const unknown: AdventureSettingsResource = {
      ...ADVENTURE_SETTINGS_FIXTURE,
      groups: [
        {
          id: 'language_packs',
          label: 'Language packs',
          value: null,
          effective_value: 'en',
          state: 'inherit' as SettingGroupState,
          source: 'user',
          options: ['en', 'de'],
          locked_reason: null,
        },
      ],
    };
    renderDrawer({ adventureSettings: unknown });
    expect(screen.getByTestId('setting-row-language_packs')).toBeTruthy();
  });
});

describe('settings catalogue', () => {
  it('declares each group id exactly once', () => {
    const ids = PLAYER_SETTINGS_GROUPS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('binds every group to exactly one API document and a valid scope', () => {
    for (const group of PLAYER_SETTINGS_GROUPS) {
      expect(['player-defaults', 'legacy']).toContain(group.document);
      expect(['user', 'adventure', 'scenario']).toContain(group.scope);
    }
  });

  it('covers every key the player-defaults resource carries', () => {
    const ids = new Set(PLAYER_SETTINGS_GROUPS.map((g) => g.id));
    for (const key of Object.keys(PLAYER_SETTINGS_FIXTURE)) {
      if (key === 'updated_at') continue;
      expect(ids.has(key)).toBe(true);
    }
  });
});

describe('useAdventureSettings surfaces', () => {
  it('drawer rows are driven by the same catalogue the page uses', async () => {
    renderDrawer();
    await waitFor(() =>
      expect(screen.getByTestId('setting-row-theme')).toBeTruthy(),
    );
    expect(findPlayerSettingsGroup('theme')?.label).toBe('Theme');
  });
});
