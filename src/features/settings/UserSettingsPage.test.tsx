import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ApiClientProvider,
  ApiError,
  PLAYER_SETTINGS_FIXTURE,
  PLAYER_SETTINGS_FIXTURE as _DEFAULT_PLAYER,
  type Fetcher,
} from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import { MemoryRouter } from 'react-router';
import UserSettingsPage from './UserSettingsPage';
import { PLAYER_SETTINGS_GROUPS } from './settingsGroups';

function makeWrapper(fetcher: Fetcher) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiClientProvider fetcher={fetcher}>
          <MemoryRouter>{children}</MemoryRouter>
        </ApiClientProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('UserSettingsPage', () => {
  it('renders every registered setting group grouped by domain', async () => {
    const fetcher: Fetcher = async () => PLAYER_SETTINGS_FIXTURE;
    render(<UserSettingsPage />, { wrapper: makeWrapper(fetcher) });
    await waitFor(() =>
      expect(screen.getByTestId('setting-narration_verbosity')).toBeInTheDocument(),
    );
    // One control per group definition.
    expect(PLAYER_SETTINGS_GROUPS.length).toBeGreaterThan(0);
    for (const group of PLAYER_SETTINGS_GROUPS) {
      expect(screen.getByTestId(`setting-${group.id}`)).toBeInTheDocument();
    }
    expect(screen.getByRole('group', { name: /reading experience/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /content & genre/i })).toBeInTheDocument();
  });

  it('disables save until the player changes a setting', async () => {
    const fetcher: Fetcher = async () => PLAYER_SETTINGS_FIXTURE;
    render(<UserSettingsPage />, { wrapper: makeWrapper(fetcher) });
    await waitFor(() =>
      expect(screen.getByTestId('setting-narration_verbosity')).toBeInTheDocument(),
    );
    const save = screen.getByRole('button', { name: /save changes/i });
    expect(save).toBeDisabled();
  });

  it('enables save after the player toggles a setting', async () => {
    const fetcher: Fetcher = async () => PLAYER_SETTINGS_FIXTURE;
    render(<UserSettingsPage />, { wrapper: makeWrapper(fetcher) });
    await waitFor(() =>
      expect(screen.getByTestId('setting-narration_verbosity')).toBeInTheDocument(),
    );
    const select = screen.getByTestId('setting-narration_verbosity') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'rich' } });
    expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled();
  });

  it('falls back to the fixture when the API is offline', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(503, { message: 'Offline', code: 'offline' });
    };
    render(<UserSettingsPage />, { wrapper: makeWrapper(fetcher) });
    await waitFor(() =>
      expect(screen.getByTestId('setting-narration_verbosity')).toBeInTheDocument(),
    );
  });
});

// Re-export so the linter keeps the helper import alive in case the
// fixture's shape evolves during refactors.
export const __testDefault = _DEFAULT_PLAYER;
