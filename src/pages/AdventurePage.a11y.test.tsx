import { describe, expect, it } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdventurePage from './AdventurePage';
import {
  ADVENTURE_SETTINGS_FIXTURE,
  ApiClientProvider,
  BRANCH_TREE_FIXTURE,
  CHARACTER_FIXTURE,
  EFFECTIVE_SETTINGS_FIXTURE,
  NPC_ROSTER_FIXTURE,
  PLAYER_SETTINGS_FIXTURE,
  RECAP_FIXTURE,
  type Fetcher,
} from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import { ADVENTURE_FIXTURE, AUTH_FIXTURE } from '@/fixtures/data';

function renderAt(fetcher: Fetcher, initialPath = '/adventures/101') {
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

function fullStage4Fetcher(): Fetcher {
  return async (path) => {
    if (path === '/auth/me') return AUTH_FIXTURE.user;
    if (path === '/adventures') return [ADVENTURE_FIXTURE];
    if (path === '/adventures/101') return ADVENTURE_FIXTURE;
    if (path === `/adventures/${ADVENTURE_FIXTURE.id}/character`) return CHARACTER_FIXTURE;
    if (path === `/adventures/${ADVENTURE_FIXTURE.id}/npcs`) return NPC_ROSTER_FIXTURE;
    if (path === `/adventures/${ADVENTURE_FIXTURE.id}/recap`) return RECAP_FIXTURE;
    if (path === `/adventures/${ADVENTURE_FIXTURE.id}/branches`) return BRANCH_TREE_FIXTURE;
    if (path === `/adventures/${ADVENTURE_FIXTURE.id}/settings`) return ADVENTURE_SETTINGS_FIXTURE;
    if (path.startsWith('/me/settings/effective')) return EFFECTIVE_SETTINGS_FIXTURE;
    if (path === '/me/settings/player-defaults') return PLAYER_SETTINGS_FIXTURE;
    return undefined;
  };
}

describe('AdventurePage — axe accessibility', () => {
  it('passes the default axe ruleset', async () => {
    const { container } = renderAt(fullStage4Fetcher());
    await waitFor(() =>
      expect(container.querySelector('[data-testid="adventure-surface"]')).toBeInTheDocument(),
    );
    await expect(container).toHaveNoViolations();
  });
});
