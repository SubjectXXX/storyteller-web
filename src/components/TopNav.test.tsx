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

describe('TopNav admin link', () => {
  it('hides the Admin link for non-admin users', async () => {
    // AUTH_FIXTURE.user has is_admin=false; the auth/me response should
    // reflect the same so the resolved context exposes the regular role.
    const fetcher: Fetcher = async (path) => {
      if (path === '/auth/me') return { ...AUTH_FIXTURE.user, is_admin: false };
      if (path === '/adventures') return [ADVENTURE_FIXTURE];
      return undefined;
    };
    const wrapper = makeWrapper('/', fetcher);
    render(<div />, { wrapper });
    await waitFor(() => {
      // Wait for the auth context to resolve so the Admin-link branch is
      // evaluated against the resolved user, not a transient null.
      expect(screen.queryByTestId('admin-link')).toBeNull();
    });
  });

  it('shows the Admin link pointing at /admin/ when the signed-in user is an admin', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === '/auth/me') return { ...AUTH_FIXTURE.user, is_admin: true };
      if (path === '/adventures') return [ADVENTURE_FIXTURE];
      return undefined;
    };
    const wrapper = makeWrapper('/', fetcher);
    render(<div />, { wrapper });
    await waitFor(() => {
      const link = screen.getByTestId('admin-link');
      expect(link).toBeTruthy();
      // Plain anchor — crossing the SPA boundary into the admin app,
      // so we deliberately avoid RouterNavLink (which would route inside
      // basename="/web").
      expect(link.tagName).toBe('A');
      expect(link.getAttribute('href')).toBe('/admin/');
    });
  });
});
