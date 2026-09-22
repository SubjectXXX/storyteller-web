import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PlaySurfacePlaceholder from './PlaySurfacePlaceholder';
import { ApiClientProvider, ApiError, fixtureFetcher } from '@/api-client';
import type { Fetcher } from '@/api-client';
import { SCENARIO_FIXTURES } from '@/fixtures/data';

function renderAt(initialPath: string, fetcher: Fetcher = fixtureFetcher()): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider fetcher={fetcher}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/play" element={<PlaySurfacePlaceholder />} />
            <Route path="/play/:adventureId?" element={<PlaySurfacePlaceholder />} />
          </Routes>
        </MemoryRouter>
      </ApiClientProvider>
    </QueryClientProvider>,
  );
}

describe('PlaySurfacePlaceholder', () => {
  it('renders the beat and the first narrative paragraph', async () => {
    renderAt('/play/demo-romance');
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /a quiet court/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/salt-wind market/i)).toBeInTheDocument();
  });

  it('exposes the choices as accessible buttons', () => {
    renderAt('/play');
    expect(screen.getByRole('button', { name: /marbled alley/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /lantern-seller/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /night barge/i })).toBeInTheDocument();
  });

  it('renders the disabled composer preview until S2 ships', () => {
    renderAt('/play');
    expect(screen.getByRole('button', { name: /send \(s2\)/i })).toBeDisabled();
  });

  it('falls back to the sample scenario title when no :adventureId is given', () => {
    renderAt('/play');
    expect(screen.getByRole('heading', { level: 1, name: /sample scenario/i })).toBeInTheDocument();
  });

  it('records a choice in the history when clicked', async () => {
    const user = userEvent.setup();
    renderAt('/play');

    await user.click(screen.getByRole('button', { name: /marbled alley/i }));
    expect(screen.getByRole('list', { name: /choices you have made/i })).toBeInTheDocument();
    expect(screen.getByText(/marbled alley/i)).toBeInTheDocument();
  });

  it('hits the play-turn endpoint when an adventureId is present', async () => {
    const calls: string[] = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      calls.push(`${options.method ?? 'GET'} ${path}`);
      if (path.startsWith('/scenarios/') && path.endsWith('/play-turn')) {
        const { PLAY_FIXTURE } = await import('@/fixtures/data');
        return PLAY_FIXTURE;
      }
      if (path.startsWith('/scenarios/')) {
        const id = decodeURIComponent(path.split('/').pop() ?? '');
        return SCENARIO_FIXTURES.find((s) => s.id === id);
      }
      throw new ApiError(404, { message: `not mocked ${path}` });
    };
    renderAt('/play/demo-romance', fetcher);

    await waitFor(() => {
      expect(calls.some((line) => line.includes('/play-turn'))).toBe(true);
    });
  });
});
