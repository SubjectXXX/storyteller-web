import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PlaySurfacePlaceholder from './PlaySurfacePlaceholder';
import {
  ApiClientProvider,
  ApiError,
} from '@/api-client';
import type { Fetcher } from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';

function renderAt(initialPath: string, fetcher: Fetcher): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    // `<AuthProvider>` calls `useNavigate()`, so the router has to sit above it.
    <MemoryRouter initialEntries={[initialPath]}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ApiClientProvider fetcher={fetcher}>
            <Routes>
              <Route path="/play" element={<PlaySurfacePlaceholder />} />
              <Route path="/play/:adventureId?" element={<PlaySurfacePlaceholder />} />
              <Route path="/adventures/:id" element={<p>live adventure</p>} />
              <Route path="/scenarios" element={<p>scenario library</p>} />
            </Routes>
          </ApiClientProvider>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

function recordingFetcher(calls: string[]): Fetcher {
  return async (path, options = {}) => {
    calls.push(`${options.method ?? 'GET'} ${path}`);
    throw new ApiError(404, { message: `not mocked ${path}`, code: 'not_found' });
  };
}

describe('PlaySurfacePlaceholder (public /play/:adventureId route)', () => {
  it('says the surface is not available instead of faking a play turn', async () => {
    renderAt('/play/101', recordingFetcher([]));
    await waitFor(() => {
      expect(screen.getByText(/this play surface is not available/i)).toBeTruthy();
    });
    expect(screen.getByText(/endpoint not available/i)).toBeTruthy();
  });

  it('issues no request at all — the deleted endpoints cannot 404', async () => {
    const calls: string[] = [];
    renderAt('/play/101', recordingFetcher(calls));
    await waitFor(() => {
      expect(screen.getByText(/this play surface is not available/i)).toBeTruthy();
    });
    expect(calls).toEqual([]);
  });

  it('never requests the removed play-turn or pinned-memories paths', async () => {
    const calls: string[] = [];
    renderAt('/play/demo-romance', recordingFetcher(calls));
    await waitFor(() => {
      expect(screen.getByText(/this play surface is not available/i)).toBeTruthy();
    });
    expect(calls.some((line) => line.includes('play-turn'))).toBe(false);
    expect(calls.some((line) => line.includes('pinned-memories'))).toBe(false);
    expect(calls.some((line) => line.startsWith('GET /scenarios/'))).toBe(false);
  });

  it('routes a numeric adventure id to the authenticated surface', async () => {
    renderAt('/play/101', recordingFetcher([]));
    const link = screen.getByRole('link', { name: /open the live adventure/i });
    expect(link.getAttribute('href')).toBe('/adventures/101');
  });

  it('does not offer a live-adventure link for a non-numeric slug', async () => {
    renderAt('/play/demo-romance', recordingFetcher([]));
    expect(screen.queryByRole('link', { name: /open the live adventure/i })).toBeNull();
    expect(screen.getByRole('link', { name: /browse scenarios/i }).getAttribute('href')).toBe('/scenarios');
  });

  it('renders the no-adventure variant on /play', async () => {
    renderAt('/play', recordingFetcher([]));
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /no adventure selected/i })).toBeTruthy();
    });
  });
});
