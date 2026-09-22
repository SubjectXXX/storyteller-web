import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdventurePage from './AdventurePage';
import {
  ApiClientProvider,
  ApiError,
} from '@/api-client';
import type { Fetcher } from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import { ADVENTURE_FIXTURE, AUTH_FIXTURE, TURN_FIXTURE } from '@/fixtures/data';

function renderAt(initialPath: string, fetcher: Fetcher) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // Pre-seed the session so AuthGate lets us through.
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

function setNativeValue(element: HTMLElement, value: string): void {
  const proto = Object.getPrototypeOf(element) as { descriptor: PropertyDescriptor | undefined };
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('AdventurePage', () => {
  it('renders the adventure detail and the composer form', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === '/auth/me') return AUTH_FIXTURE.user;
      if (path === '/adventures/101') return ADVENTURE_FIXTURE;
      if (path === '/adventures') return [ADVENTURE_FIXTURE];
      return undefined;
    };
    renderAt('/adventures/101', fetcher);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /cartographer/i })).toBeTruthy();
    });
    expect(screen.getByLabelText(/say or do something/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /submit turn/i })).toBeTruthy();
  });

  it('redirects to /not-a-real-page on a 404', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === '/auth/me') return AUTH_FIXTURE.user;
      if (path === '/adventures') return [];
      if (/^\/adventures\/\d+$/.test(path)) {
        throw new ApiError(404, { message: 'Not found', code: 'not_found' });
      }
      return undefined;
    };
    renderAt('/adventures/999', fetcher);
    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeTruthy();
    });
  });

  it('POSTs a turn when the user clicks Submit', async () => {
    const calls: string[] = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      const method = options.method ?? 'GET';
      calls.push(`${method} ${path}`);
      if (path === '/auth/me') return AUTH_FIXTURE.user;
      if (path === '/adventures') return [ADVENTURE_FIXTURE];
      if (path === '/adventures/101' && method === 'GET') return ADVENTURE_FIXTURE;
      if (path === '/adventures/101/turns' && method === 'POST') return TURN_FIXTURE;
      return undefined;
    };
    renderAt('/adventures/101', fetcher);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit turn/i })).toBeTruthy();
    });

    setNativeValue(screen.getByLabelText(/say or do something/i), 'Open the drawer.');
    fireEvent.click(screen.getByRole('button', { name: /submit turn/i }));

    await waitFor(() => {
      expect(calls).toContain('POST /adventures/101/turns');
    });
  });

  it('surfaces a 409 version_conflict when the server rejects the turn', async () => {
    const fetcher: Fetcher = async (path, options = {}) => {
      const method = options.method ?? 'GET';
      if (path === '/auth/me') return AUTH_FIXTURE.user;
      if (path === '/adventures') return [ADVENTURE_FIXTURE];
      if (path === '/adventures/101' && method === 'GET') return ADVENTURE_FIXTURE;
      if (path === '/adventures/101/turns' && method === 'POST') {
        throw new ApiError(409, { message: 'Stale branch version', code: 'version_conflict' });
      }
      return undefined;
    };
    renderAt('/adventures/101', fetcher);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit turn/i })).toBeTruthy();
    });

    setNativeValue(screen.getByLabelText(/say or do something/i), 'Try again.');
    fireEvent.click(screen.getByRole('button', { name: /submit turn/i }));

    await waitFor(() => {
      const alert = screen.queryByRole('alert');
      expect(alert?.textContent).toMatch(/stale branch version/i);
    });
  });
});
