import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/auth/AuthContext';
import { ApiClientProvider } from '@/api-client';
import { AuthGate } from './AuthGate';
import { AUTH_FIXTURE } from '@/fixtures/data';
import type { Fetcher } from '@/api-client';

function Page(): React.ReactElement {
  return <div data-testid="protected-content">Protected content</div>;
}

function Login(): React.ReactElement {
  return <div data-testid="login-page">Login</div>;
}

function makeTree(fetcher: Fetcher) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiClientProvider fetcher={fetcher}>
          <MemoryRouter initialEntries={['/adventures/101']}>
            <Routes>
              <Route
                path="/adventures/:id"
                element={
                  <AuthGate>
                    <Page />
                  </AuthGate>
                }
              />
              <Route path="/login" element={<Login />} />
            </Routes>
          </MemoryRouter>
        </ApiClientProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('AuthGate', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('redirects unauthenticated visitors to /login', async () => {
    const fetcher: Fetcher = async () => undefined;
    makeTree(fetcher);
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeTruthy();
    });
    expect(window.location.pathname).toBe('/login');
  });

  it('renders the protected content when a token is present', async () => {
    window.localStorage.setItem('storyteller.session.token', AUTH_FIXTURE.token);
    const fetcher: Fetcher = async (path) => {
      if (path === '/auth/me') return AUTH_FIXTURE.user;
      return undefined;
    };
    makeTree(fetcher);
    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeTruthy();
    });
  });
});
