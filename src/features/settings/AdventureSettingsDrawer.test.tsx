import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  ADVENTURE_SETTINGS_FIXTURE,
  ApiError,
  PLAYER_SETTINGS_FIXTURE,
} from '@/api-client';
import { AdventureSettingsDrawer } from './AdventureSettingsDrawer';

describe('AdventureSettingsDrawer', () => {
  it('renders one row per group and the resolution source pill', () => {
    render(
      <AdventureSettingsDrawer
        adventureId={ADVENTURE_SETTINGS_FIXTURE.adventure_id}
        branchId={ADVENTURE_SETTINGS_FIXTURE.branch_id}
        adventureSettings={ADVENTURE_SETTINGS_FIXTURE}
        userSettings={PLAYER_SETTINGS_FIXTURE}
        isLoading={false}
        error={null}
        onSave={() => undefined}
        onClose={() => undefined}
        saving={false}
      />,
    );
    expect(screen.getByRole('dialog', { name: /adventure settings/i })).toBeInTheDocument();
    for (const group of ADVENTURE_SETTINGS_FIXTURE.groups) {
      expect(screen.getByTestId(`adventure-setting-${group.id}`)).toBeInTheDocument();
    }
    expect(screen.getAllByText(/inherited from user defaults|adventure override|scenario default/i).length).toBeGreaterThan(0);
  });

  it('invokes onSave with the built update body', () => {
    const onSave = vi.fn();
    render(
      <AdventureSettingsDrawer
        adventureId={ADVENTURE_SETTINGS_FIXTURE.adventure_id}
        branchId={ADVENTURE_SETTINGS_FIXTURE.branch_id}
        adventureSettings={ADVENTURE_SETTINGS_FIXTURE}
        userSettings={PLAYER_SETTINGS_FIXTURE}
        isLoading={false}
        error={null}
        onSave={onSave}
        onClose={() => undefined}
        saving={false}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /save overrides/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const body = onSave.mock.calls[0]?.[0];
    expect(body).toMatchObject({ branch_id: ADVENTURE_SETTINGS_FIXTURE.branch_id });
    expect(Array.isArray(body?.groups)).toBe(true);
  });

  it('streams live changes via onChange', () => {
    const onChange = vi.fn();
    render(
      <AdventureSettingsDrawer
        adventureId={ADVENTURE_SETTINGS_FIXTURE.adventure_id}
        branchId={ADVENTURE_SETTINGS_FIXTURE.branch_id}
        adventureSettings={ADVENTURE_SETTINGS_FIXTURE}
        userSettings={PLAYER_SETTINGS_FIXTURE}
        isLoading={false}
        error={null}
        onChange={onChange}
        onSave={() => undefined}
        onClose={() => undefined}
        saving={false}
      />,
    );
    // Toggle the first non-locked group ("typewriter_mode") to override
    // via the Inherit button (safe even when state === inherit).
    const inheritButton = screen.getByRole('button', { name: /inherit typewriter mode/i });
    fireEvent.click(inheritButton);
    expect(onChange).toHaveBeenCalled();
  });

  it('renders a loading skeleton when the query is pending and no data is present', () => {
    render(
      <AdventureSettingsDrawer
        adventureId={1}
        branchId={1}
        adventureSettings={undefined}
        userSettings={undefined}
        isLoading
        error={null}
        onSave={() => undefined}
        onClose={() => undefined}
        saving={false}
      />,
    );
    expect(screen.getByText(/loading adventure settings/i)).toBeInTheDocument();
  });

  it('renders an error message when the API returned an error', async () => {
    const error = new ApiError(500, { message: 'Adventure settings offline', code: 'offline' });
    render(
      <AdventureSettingsDrawer
        adventureId={1}
        branchId={1}
        adventureSettings={undefined}
        userSettings={undefined}
        isLoading={false}
        error={error}
        onSave={() => undefined}
        onClose={() => undefined}
        saving={false}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/offline/i);
    // Sanity: the close button still works.
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
  });

  // R23b P0-1: a partial server payload (loading state, optimistic
  // update, or a 404 fallback) can omit the `groups` field. Iterating
  // undefined used to throw `groups is not iterable` and unmount the
  // page via the ErrorBoundary. The drawer must render without crashing
  // when groups is missing.
  it('renders without crashing when adventureSettings.groups is undefined or empty', () => {
    const partial = {
      ...ADVENTURE_SETTINGS_FIXTURE,
      groups: undefined as unknown as typeof ADVENTURE_SETTINGS_FIXTURE.groups,
    };
    expect(() =>
      render(
        <AdventureSettingsDrawer
          adventureId={partial.adventure_id}
          branchId={partial.branch_id}
          adventureSettings={partial}
          userSettings={PLAYER_SETTINGS_FIXTURE}
          isLoading={false}
          error={null}
          onSave={() => undefined}
          onClose={() => undefined}
          saving={false}
        />,
      ),
    ).not.toThrow();
    expect(screen.getByRole('dialog', { name: /adventure settings/i })).toBeInTheDocument();
  });
});
