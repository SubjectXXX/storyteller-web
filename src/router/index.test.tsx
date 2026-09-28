/**
 * Routing contract for the settings surfaces.
 *
 * Guards the two properties the collapse has to hold:
 *   (a) `/settings` reaches the one canonical settings screen, and
 *   (b) no built, exported settings screen is left unrouted.
 */
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import {
  ApiClientProvider,
  PLAYER_SETTINGS_FIXTURE,
  type Fetcher,
} from '@/api-client';
import { ADVENTURE_LIST_FIXTURE, SETTINGS_RESOURCE_FIXTURE } from '@/fixtures/data';
import { AuthContext } from '@/auth/context';
import type { AuthContextValue } from '@/auth/AuthContext';
import { router } from './index';
import * as lazyPages from './lazyPages';

const fetcher: Fetcher = async (path) => {
  // `<PageShell>` renders `<TopNav>`, which reads the adventure list.
  if (path === '/adventures') return ADVENTURE_LIST_FIXTURE;
  if (path === '/me/settings/player-defaults') return PLAYER_SETTINGS_FIXTURE;
  if (path === '/me/settings') return SETTINGS_RESOURCE_FIXTURE;
  return {};
};

/**
 * `/settings` is auth-gated and `<AuthGate>` redirects to `/login` without a
 * bearer token, so seed the auth context directly. Going through
 * `<AuthProvider>` would issue a real `GET /api/auth/me`, and this
 * happy-dom build has neither `window.localStorage` nor a live API.
 */
const signedIn: AuthContextValue = {
  token: 'test-token',
  user: null,
  ready: true,
  loading: false,
  error: null,
  signIn: async () => ({ token: 'test-token', user: null }) as never,
  signUp: async () => ({ token: 'test-token', user: null }) as never,
  signOut: async () => undefined,
};

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={queryClient}>
      {/* AuthProvider calls useNavigate(), so the router must be outermost. */}
      <MemoryRouter initialEntries={['/settings']}>
        <AuthContext.Provider value={signedIn}>
          <ApiClientProvider fetcher={fetcher}>{children}</ApiClientProvider>
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('settings routing', () => {
  it('serves the canonical settings screen at /settings', async () => {
    render(router(), { wrapper: makeWrapper() });
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /preferences & defaults/i })).toBeTruthy(),
    );
    // The catalogue-backed screen, not the legacy flat-document one.
    expect(screen.getByTestId('setting-row-narration_verbosity')).toBeTruthy();
  });

  it('leaves no built-but-unrouted settings screen behind', () => {
    // Every lazy page export must correspond to a routed element. The
    // duplicate `SettingsPage` used to be exported here with no <Route>.
    const exported = Object.keys(lazyPages);
    expect(exported).toContain('UserSettingsPage');
    expect(exported).not.toContain('SettingsPage');
  });
});
