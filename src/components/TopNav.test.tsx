import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';
import { TopNav } from './TopNav';
import {
  ApiClientProvider,
  makeFixtureStream,
} from '@/api-client';
import type { Fetcher, StreamEvent } from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import { ADVENTURE_FIXTURE, AUTH_FIXTURE } from '@/fixtures/data';

function makeWrapper(initialPath: string, fetcher: Fetcher) {
  window.localStorage.setItem('storyteller.session.token', AUTH_FIXTURE.token);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiClientProvider fetcher={fetcher}>
          <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
              <Route path="*" element={<>{children}<TopNav /></>} />
            </Routes>
          </MemoryRouter>
        </ApiClientProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('TopNav streaming indicator', () => {
  it('does not render the Streaming pill when no stream is active', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === '/auth/me') return AUTH_FIXTURE.user;
      if (path === '/adventures') return [ADVENTURE_FIXTURE];
      return undefined;
    };
    const wrapper = makeWrapper('/', fetcher);
    render(<div />, { wrapper });
    await waitFor(() => {
      expect(screen.queryByTestId('streaming-pill')).toBeNull();
    });
  });

  it('renders the Streaming pill when the player is mid-turn on the active adventure', async () => {
    // A stream that stays open (no end event) so `streaming` stays true
    // while the test inspects the DOM.
    const events: StreamEvent[] = [
      { type: 'turn', turn_id: 1, chunk_index: 0, narration: 'partial' },
    ];
    const fetcher: Fetcher = async (path) => {
      if (path === '/auth/me') return AUTH_FIXTURE.user;
      if (path === '/adventures') return [ADVENTURE_FIXTURE];
      if (path.startsWith('/adventures/101/stream')) {
        // Hold the stream open without an `end` event.
        return makeFixtureStream(events);
      }
      return undefined;
    };
    const wrapper = makeWrapper('/adventures/101', fetcher);
    render(<div />, { wrapper });
    await waitFor(() => {
      expect(screen.getByTestId('streaming-pill')).toBeTruthy();
    });
    expect(screen.getByTestId('streaming-pill').textContent).toMatch(/Streaming/);
  });
});
