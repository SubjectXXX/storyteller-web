import { describe, expect, it } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
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

function setViewport(width: number): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes(`max-width: 767px`)
        ? width < 768
        : query.includes('min-width: 768px')
          ? width >= 768
          : false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
}

function renderAt(fetcher: Fetcher) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  window.localStorage.setItem('storyteller.session.token', AUTH_FIXTURE.token);
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiClientProvider fetcher={fetcher}>
          <MemoryRouter initialEntries={['/adventures/101']}>
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

describe('AdventurePage — viewport behaviour', () => {
  it('renders the world grid on desktop (>=768px)', async () => {
    setViewport(1280);
    const { container } = renderAt(fullStage4Fetcher());
    await waitFor(() =>
      expect(container.querySelector('[data-testid="adventure-world-grid"]')).toBeInTheDocument(),
    );
    expect(container.querySelector('[data-testid="adventure-world-grid"]')).toBeTruthy();
  });

  it('still mounts every panel on mobile (<768px) and the branch tree popover opens', async () => {
    setViewport(420);
    const { container } = renderAt(fullStage4Fetcher());
    await waitFor(() =>
      expect(container.querySelector('[data-testid="adventure-world-grid"]')).toBeInTheDocument(),
    );
    fireEvent.click(container.querySelector('[aria-haspopup="dialog"]') as HTMLElement);
    expect(container.querySelector('[role="dialog"][aria-label="Branch tree"]')).toBeTruthy();
  });
});
