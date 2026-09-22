import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PlaySurfacePlaceholder from './PlaySurfacePlaceholder';
import {
  ApiClientProvider,
  ApiError,
  fixtureFetcher,
} from '@/api-client';
import type { Fetcher } from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import { PLAY_FIXTURE, SCENARIO_RESOURCE_FIXTURES } from '@/fixtures/data';

function renderAt(initialPath: string, fetcher: Fetcher = fixtureFetcher()): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiClientProvider fetcher={fetcher}>
          <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
              <Route path="/play" element={<PlaySurfacePlaceholder />} />
              <Route path="/play/:adventureId?" element={<PlaySurfacePlaceholder />} />
            </Routes>
          </MemoryRouter>
        </ApiClientProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('PlaySurfacePlaceholder (legacy S1 surface, kept for /play/:id fallback)', () => {
  it('renders the beat and the first narrative paragraph for a known slug', async () => {
    renderAt('/play/demo-romance');
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /a quiet court/i })).toBeTruthy();
    });
    expect(screen.getByText(/salt-wind market/i)).toBeTruthy();
  });

  it('exposes the choices as accessible buttons', () => {
    renderAt('/play');
    expect(screen.getByRole('button', { name: /marbled alley/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /lantern-seller/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /night barge/i })).toBeTruthy();
  });

  it('renders the disabled composer preview until S2 ships', () => {
    renderAt('/play');
    const send = screen.getByRole('button', { name: /send \(s2\)/i }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
  });

  it('records a choice in the history when clicked', async () => {
    renderAt('/play');

    fireEvent.click(screen.getByRole('button', { name: /marbled alley/i }));
    expect(screen.getByRole('list', { name: /choices you have made/i })).toBeTruthy();
    expect(screen.getByText(/marbled alley/i)).toBeTruthy();
  });

  it('hits the legacy play-turn endpoint when an adventureId is present', async () => {
    const calls: string[] = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      calls.push(`${options.method ?? 'GET'} ${path}`);
      if (path.startsWith('/scenarios/') && path.endsWith('/play-turn')) {
        return PLAY_FIXTURE;
      }
      if (path.startsWith('/scenarios/')) {
        const slug = decodeURIComponent(path.split('/').pop() ?? '');
        return SCENARIO_RESOURCE_FIXTURES.find((s) => s.slug === slug);
      }
      throw new ApiError(404, { message: `not mocked ${path}` });
    };
    renderAt('/play/demo-romance', fetcher);

    await waitFor(() => {
      expect(calls.some((line) => line.includes('/play-turn'))).toBe(true);
    });
  });
});
