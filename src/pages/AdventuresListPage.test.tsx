import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdventuresListPage from './AdventuresListPage';
import {
  ApiClientProvider,
  ApiError,
  fixtureFetcher,
} from '@/api-client';
import type { Fetcher } from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import { ADVENTURE_LIST_FIXTURE } from '@/fixtures/data';

function renderWith(fetcher: Fetcher = fixtureFetcher()): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiClientProvider fetcher={fetcher}>
          <MemoryRouter initialEntries={['/adventures']}>
            <AdventuresListPage />
          </MemoryRouter>
        </ApiClientProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('AdventuresListPage', () => {
  it('shows the empty state when the player has no adventures yet', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === '/adventures') return [];
      return undefined;
    };
    renderWith(fetcher);
    await waitFor(() => {
      expect(screen.getByTestId('adventures-empty')).toBeTruthy();
    });
    expect(screen.getByRole('heading', { name: /no adventures yet/i })).toBeTruthy();
  });

  it('shows the loading panel while the list query is in flight', async () => {
    // A fetcher that never resolves keeps the query in 'pending' state.
    const fetcher: Fetcher = (_path) => new Promise(() => {});
    renderWith(fetcher);
    expect(screen.getByRole('status', { name: /loading/i })).toBeTruthy();
  });

  it('shows the error state when the adventures endpoint fails', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(500, { message: 'Backend exploded', code: 'server_error' });
    };
    renderWith(fetcher);
    await waitFor(() => {
      expect(screen.getByTestId('adventures-error')).toBeTruthy();
    });
    expect(screen.getByRole('heading', { name: /could not load/i })).toBeTruthy();
  });

  it('renders one row per adventure, each linking to /adventures/:id', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === '/adventures') return ADVENTURE_LIST_FIXTURE;
      return undefined;
    };
    renderWith(fetcher);
    await waitFor(() => {
      expect(screen.getAllByTestId('adventure-row')).toHaveLength(ADVENTURE_LIST_FIXTURE.length);
    });
    for (const adventure of ADVENTURE_LIST_FIXTURE) {
      const titleLink = screen.getByRole('link', { name: adventure.title });
      expect(titleLink.getAttribute('href')).toBe(`/adventures/${adventure.id}`);
    }
  });

  it('sorts newest-first when multiple adventures have distinct last_played_at', async () => {
    const fixtures = [
      { ...ADVENTURE_LIST_FIXTURE[0], id: 1, title: 'Older',  last_played_at: '2026-09-10T12:00:00Z' },
      { ...ADVENTURE_LIST_FIXTURE[0], id: 2, title: 'Newest', last_played_at: '2026-09-22T18:00:00Z' },
      { ...ADVENTURE_LIST_FIXTURE[0], id: 3, title: 'Middle', last_played_at: '2026-09-15T12:00:00Z' },
    ];
    const fetcher: Fetcher = async (path) => {
      if (path === '/adventures') return fixtures;
      return undefined;
    };
    renderWith(fetcher);
    await waitFor(() => {
      expect(screen.getAllByTestId('adventure-row')).toHaveLength(3);
    });
    const titles = screen.getAllByTestId('adventure-row').map(
      (row) => row.querySelector('a')?.textContent,
    );
    expect(titles).toEqual(['Newest', 'Middle', 'Older']);
  });
});
