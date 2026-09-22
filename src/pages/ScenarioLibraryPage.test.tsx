import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ScenarioLibraryPage from './ScenarioLibraryPage';
import { ApiClientProvider, ApiError, fixtureFetcher } from '@/api-client';
import type { Fetcher } from '@/api-client';

function renderWithFetcher(fetcher: Fetcher) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider fetcher={fetcher}>
        <MemoryRouter>
          <ScenarioLibraryPage />
        </MemoryRouter>
      </ApiClientProvider>
    </QueryClientProvider>,
  );
}

describe('ScenarioLibraryPage', () => {
  it('renders every fixture scenario from data.ts (fixture fallback path)', () => {
    renderWithFetcher(fixtureFetcher());

    expect(screen.getByRole('heading', { level: 2, name: /a quiet court/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /cartographer/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /beyond the reef/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /ember/i })).toBeInTheDocument();
  });

  it('renders a Start run link for every scenario', () => {
    renderWithFetcher(fixtureFetcher());

    const starts = screen.getAllByRole('link', { name: /start run/i });
    expect(starts.length).toBeGreaterThanOrEqual(4);
    expect(starts[0]).toHaveAttribute('href', '/play/demo-romance');
  });

  it('renders the rating pills', () => {
    renderWithFetcher(fixtureFetcher());

    expect(screen.getAllByText(/all ages/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/mature/i).length).toBeGreaterThanOrEqual(2);
  });

  it('hits /api/scenarios on mount and renders the response', async () => {
    const observed: string[] = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      observed.push(`${options.method ?? 'GET'} ${path}`);
      const { SCENARIO_FIXTURES } = await import('@/fixtures/data');
      return SCENARIO_FIXTURES;
    };
    renderWithFetcher(fetcher);

    await waitFor(() => {
      expect(observed.some((line) => line.endsWith('/scenarios'))).toBe(true);
    });
  });

  it('renders the offline banner when the API fails but keeps the fixture list visible', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(503, { message: 'Service unavailable', code: 'down' });
    };
    renderWithFetcher(fetcher);

    await waitFor(() => {
      expect(screen.getByTestId('library-error')).toBeInTheDocument();
    });
    // The fixture list is still rendered as a graceful fallback.
    expect(screen.getByRole('heading', { level: 2, name: /a quiet court/i })).toBeInTheDocument();
  });

  it('filters the list locally when the user types into the search box', async () => {
    const user = userEvent.setup();
    renderWithFetcher(fixtureFetcher());

    const input = screen.getByPlaceholderText(/filter scenarios/i);
    await user.type(input, 'reef');

    expect(screen.getByRole('heading', { level: 2, name: /beyond the reef/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: /a quiet court/i })).not.toBeInTheDocument();
  });
});
