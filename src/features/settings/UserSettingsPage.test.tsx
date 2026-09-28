import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import {
  ApiClientProvider,
  ApiError,
  PLAYER_SETTINGS_FIXTURE,
  type Fetcher,
} from '@/api-client';
import { SETTINGS_RESOURCE_FIXTURE } from '@/fixtures/data';
import { AuthContext } from '@/auth/context';
import type { AuthContextValue } from '@/auth/AuthContext';
import UserSettingsPage from './UserSettingsPage';
import { PLAYER_SETTINGS_GROUPS, isUserWritable } from './settingsGroups';

const signedIn: AuthContextValue = {
  token: 'test-token',
  user: null,
  ready: true,
  loading: false,
  error: null,
  signIn: async () => ({ token: 't', user: null }) as never,
  signUp: async () => ({ token: 't', user: null }) as never,
  signOut: async () => undefined,
};

function makeWrapper(fetcher: Fetcher) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthContext.Provider value={signedIn}>
          <ApiClientProvider fetcher={fetcher}>{children}</ApiClientProvider>
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const okFetcher: Fetcher = async (path) => {
  if (path === '/me/settings/player-defaults') return PLAYER_SETTINGS_FIXTURE;
  if (path === '/me/settings') return SETTINGS_RESOURCE_FIXTURE;
  return {};
};

describe('UserSettingsPage', () => {
  it('renders exactly one row per catalogue group', async () => {
    render(<UserSettingsPage />, { wrapper: makeWrapper(okFetcher) });
    await waitFor(() =>
      expect(screen.getByTestId('setting-row-narration_verbosity')).toBeTruthy(),
    );
    for (const group of PLAYER_SETTINGS_GROUPS) {
      expect(screen.getByTestId(`setting-row-${group.id}`)).toBeTruthy();
    }
    expect(screen.getByRole('group', { name: /reading experience/i })).toBeTruthy();
    expect(screen.getByRole('group', { name: /content & genre/i })).toBeTruthy();
  });

  it('marks a group at its catalogue default as Inherited', async () => {
    render(<UserSettingsPage />, { wrapper: makeWrapper(okFetcher) });
    const row = await screen.findByTestId('setting-row-narration_verbosity');
    expect(row.getAttribute('data-inherited')).toBe('true');
    expect(screen.getByTestId('setting-reset-narration_verbosity').hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('disables the save button until the player changes a setting', async () => {
    render(<UserSettingsPage />, { wrapper: makeWrapper(okFetcher) });
    await screen.findByTestId('setting-row-narration_verbosity');
    expect(screen.getByRole('button', { name: /save changes/i }).hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('persists an edited group through PUT /me/settings/player-defaults', async () => {
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      const method = options.method ?? 'GET';
      calls.push({ method, path, body: options.body });
      if (method === 'PUT') {
        return { ...PLAYER_SETTINGS_FIXTURE, ...(options.body as object) };
      }
      return okFetcher(path, options);
    };
    render(<UserSettingsPage />, { wrapper: makeWrapper(fetcher) });

    const select = await screen.findByTestId('setting-narration_verbosity');
    fireEvent.change(select, { target: { value: 'rich' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      const put = calls.find(
        (c) => c.method === 'PUT' && c.path === '/me/settings/player-defaults',
      );
      expect(put).toBeDefined();
      expect(put?.body).toMatchObject({ narration_verbosity: 'rich' });
    });
  });

  it('routes the legacy content-warnings group to PUT /me/settings', async () => {
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      const method = options.method ?? 'GET';
      calls.push({ method, path, body: options.body });
      if (method === 'PUT') return { ...SETTINGS_RESOURCE_FIXTURE, ...(options.body as object) };
      return okFetcher(path, options);
    };
    render(<UserSettingsPage />, { wrapper: makeWrapper(fetcher) });

    const input = await screen.findByTestId('setting-content_warnings');
    fireEvent.change(input, { target: { value: 'violence, grief' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      const put = calls.find((c) => c.method === 'PUT' && c.path === '/me/settings');
      expect(put).toBeDefined();
      expect(put?.body).toMatchObject({ content_warnings: ['violence', 'grief'] });
    });
    // The legacy key must not leak into the player-defaults document.
    const playerPut = calls.find(
      (c) => c.method === 'PUT' && c.path === '/me/settings/player-defaults',
    );
    expect(playerPut).toBeUndefined();
  });

  it('Reset restores the inherited default for a single group', async () => {
    render(<UserSettingsPage />, { wrapper: makeWrapper(okFetcher) });
    const select = await screen.findByTestId('setting-narration_verbosity');
    fireEvent.change(select, { target: { value: 'terse' } });

    const row = screen.getByTestId('setting-row-narration_verbosity');
    expect(row.getAttribute('data-inherited')).toBe('false');

    fireEvent.click(screen.getByTestId('setting-reset-narration_verbosity'));

    await waitFor(() =>
      expect(
        screen.getByTestId('setting-row-narration_verbosity').getAttribute('data-inherited'),
      ).toBe('true'),
    );
    expect(
      (screen.getByTestId('setting-narration_verbosity') as HTMLSelectElement).value,
    ).toBe('balanced');
  });

  it('renders a scenario-scoped group as locked rather than editable', async () => {
    render(<UserSettingsPage />, { wrapper: makeWrapper(okFetcher) });
    // `content_rating` is scenario-scoped on the server, so a user default
    // for it is inert and the control must not look editable.
    const group = PLAYER_SETTINGS_GROUPS.find((g) => g.id === 'content_rating')!;
    expect(isUserWritable(group)).toBe(false);

    const select = await screen.findByTestId('setting-content_rating');
    expect(select.hasAttribute('disabled')).toBe(true);
    expect(
      screen.getByTestId('setting-row-content_rating').getAttribute('data-locked'),
    ).toBe('true');
  });

  it('surfaces the save error banner when the PUT fails', async () => {
    const fetcher: Fetcher = async (path, options = {}) => {
      if ((options.method ?? 'GET') === 'PUT') {
        throw new ApiError(422, { message: 'Validation failed', code: 'invalid_payload' });
      }
      return okFetcher(path, options);
    };
    render(<UserSettingsPage />, { wrapper: makeWrapper(fetcher) });

    fireEvent.change(await screen.findByTestId('setting-narration_verbosity'), {
      target: { value: 'terse' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/save failed/i);
    });
  });
});
