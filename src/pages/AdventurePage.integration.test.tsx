import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdventurePage from './AdventurePage';
import {
  ADVENTURE_FIXTURE,
  ADVENTURE_SETTINGS_FIXTURE,
  ApiClientProvider,
  BRANCH_TREE_FIXTURE,
  CHARACTER_FIXTURE,
  EFFECTIVE_SETTINGS_FIXTURE,
  NPC_ROSTER_FIXTURE,
  PLAYER_SETTINGS_FIXTURE,
  RECAP_FIXTURE,
  TURN_FIXTURE,
  type Fetcher,
} from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import { AUTH_FIXTURE } from '@/fixtures/data';

function renderAt(initialPath: string, fetcher: Fetcher) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  window.localStorage.setItem('storyteller.session.token', AUTH_FIXTURE.token);
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiClientProvider fetcher={fetcher}>
          <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
              <Route path="/adventures/:id" element={<AdventurePage />} />
              <Route path="/not-a-real-page" element={<div>Not Found</div>} />
            </Routes>
          </MemoryRouter>
        </ApiClientProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

/**
 * Stage-4 fetcher that handles every endpoint the AdventurePage touches.
 * Tests opt into mutation overrides via the supplied overrides object.
 */
function stage4Fetcher(overrides: Partial<{
  putSettings: (body: unknown) => unknown;
  retryBranch: () => unknown;
}> = {}): Fetcher {
  return async (path, options = {}) => {
    const method = options.method ?? 'GET';
    if (path === '/auth/me') return AUTH_FIXTURE.user;
    if (path === '/adventures') return [ADVENTURE_FIXTURE];
    if (path === '/adventures/101' && method === 'GET') return ADVENTURE_FIXTURE;
    if (path === '/adventures/101/turns' && method === 'POST') return TURN_FIXTURE;
    if (path === `/adventures/${ADVENTURE_FIXTURE.id}/character`) return CHARACTER_FIXTURE;
    if (path === `/adventures/${ADVENTURE_FIXTURE.id}/npcs`) return NPC_ROSTER_FIXTURE;
    if (path === `/adventures/${ADVENTURE_FIXTURE.id}/recap`) return RECAP_FIXTURE;
    if (path === `/adventures/${ADVENTURE_FIXTURE.id}/branches` && method === 'GET')
      return BRANCH_TREE_FIXTURE;
    if (
      path === `/adventures/${ADVENTURE_FIXTURE.id}/branches/${ADVENTURE_FIXTURE.current_branch.id}/retry`
      && method === 'POST'
    )
      return overrides.retryBranch ? overrides.retryBranch() : ADVENTURE_FIXTURE.current_branch;
    if (path === `/adventures/${ADVENTURE_FIXTURE.id}/settings` && method === 'GET')
      return ADVENTURE_SETTINGS_FIXTURE;
    if (path === `/adventures/${ADVENTURE_FIXTURE.id}/settings` && method === 'PUT') {
      return overrides.putSettings ? overrides.putSettings(options.body) : ADVENTURE_SETTINGS_FIXTURE;
    }
    if (path.startsWith('/me/settings/effective')) return EFFECTIVE_SETTINGS_FIXTURE;
    if (path === '/me/settings/player-defaults' && method === 'GET') return PLAYER_SETTINGS_FIXTURE;
    if (path === '/me/settings/player-defaults' && method === 'PUT')
      return { ...PLAYER_SETTINGS_FIXTURE, ...((options.body as object) ?? {}) };
    return undefined;
  };
}

describe('AdventurePage — world panels integration', () => {
  it('renders every Stage 4 panel alongside the existing narration / composer', async () => {
    renderAt('/adventures/101', stage4Fetcher());
    await waitFor(() => expect(screen.getByText(CHARACTER_FIXTURE.name)).toBeInTheDocument());
    expect(screen.getByText(NPC_ROSTER_FIXTURE[0]!.name)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /memory|recap/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /suspicion/i })).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /branch navigation/i })).toBeInTheDocument();
  });

  it('dispatches the retry mutation when the player clicks Retry', async () => {
    const retrySpy = vi.fn(() => ADVENTURE_FIXTURE.current_branch);
    renderAt('/adventures/101', stage4Fetcher({ retryBranch: retrySpy }));
    await waitFor(() => expect(screen.getByText(CHARACTER_FIXTURE.name)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /retry the current branch/i }));
    await waitFor(() => expect(retrySpy).toHaveBeenCalled());
  });
});

describe('AdventurePage — settings drawer integration', () => {
  it('opens the drawer, fires onChange for theme, and saves overrides', async () => {
    const putSpy = vi.fn(() => ADVENTURE_SETTINGS_FIXTURE);
    renderAt('/adventures/101', stage4Fetcher({ putSettings: putSpy }));
    await waitFor(() => expect(screen.getByText(CHARACTER_FIXTURE.name)).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('open-adventure-settings'));
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /adventure settings/i })).toBeInTheDocument(),
    );

    // Click "Inherit typewriter_mode" — onChange should fire.
    fireEvent.click(screen.getByRole('button', { name: /inherit typewriter mode/i }));
    fireEvent.click(screen.getByRole('button', { name: /save overrides/i }));
    await waitFor(() => expect(putSpy).toHaveBeenCalled());
  });
});
