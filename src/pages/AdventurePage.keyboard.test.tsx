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

describe('AdventurePage — keyboard navigation', () => {
  it('keeps Undo / Redo / Retry in the bottom action bar and removes all branching UI', async () => {
    const { container, getByRole, queryByRole } = renderAt(fullStage4Fetcher());
    await waitFor(() =>
      expect(getByRole('group', { name: /turn actions/i })).toBeTruthy(),
    );
    // The three surviving turn actions are still present, in the bar.
    const retry = container.querySelector('[aria-label*="Retry the current branch"]') as HTMLElement;
    const undo = container.querySelector('[aria-label*="Undo the last turn"]') as HTMLElement;
    const redo = container.querySelector('[aria-label*="Redo the next turn"]') as HTMLElement;
    expect(retry).toBeTruthy();
    expect(undo).toBeTruthy();
    expect(redo).toBeTruthy();
    expect(redo).toHaveAttribute('disabled');
    // Branching is gone: no tree trigger, no tree dialog, no fork action.
    expect(container.querySelector('[aria-haspopup="dialog"]')).toBeNull();
    expect(queryByRole('dialog', { name: 'Branch tree' })).toBeNull();
    expect(container.textContent).not.toMatch(/fork branch/i);
    expect(container.textContent).not.toMatch(/view tree|hide tree/i);
  });

  it('exposes the context rail as a tablist that arrow keys can traverse', async () => {
    const { getByRole } = renderAt(fullStage4Fetcher());
    await waitFor(() => expect(getByRole('tablist')).toBeTruthy());

    const tablist = getByRole('tablist');
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]')) as HTMLElement[];
    expect(tabs.map((t) => t.textContent)).toEqual([
      'Character',
      'NPC Codex',
      'Memory & Lore',
      'Dice & Checks',
    ]);
    // Character is selected on arrival.
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    // Roving tabindex: only the selected tab is in the tab order.
    expect(tabs[0].getAttribute('tabindex')).toBe('0');
    expect(tabs[1].getAttribute('tabindex')).toBe('-1');
    // Every tab points at the same panel, which is labelled by the
    // selected tab.
    for (const tab of tabs) {
      expect(tab.getAttribute('aria-controls')).toBe('context-rail-panel');
    }
    expect(getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(
      'context-rail-tab-character',
    );

    // ArrowRight moves selection and focus; ArrowLeft wraps back.
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    const next = getByRole('tablist').querySelector('[aria-selected="true"]') as HTMLElement;
    expect(next.textContent).toBe('NPC Codex');
    expect(document.activeElement).toBe(next);
    fireEvent.keyDown(next, { key: 'ArrowLeft' });
    const wrapped = getByRole('tablist').querySelector('[aria-selected="true"]') as HTMLElement;
    expect(wrapped.textContent).toBe('Character');
  });

  it('the Open Settings button is reachable via tab and has an aria-label', async () => {
    const { getByTestId } = renderAt(fullStage4Fetcher());
    await waitFor(() => expect(getByTestId('open-adventure-settings')).toBeInTheDocument());
    const btn = getByTestId('open-adventure-settings');
    expect(btn).toHaveAttribute('aria-label', /open per-adventure settings/i);
  });
});
