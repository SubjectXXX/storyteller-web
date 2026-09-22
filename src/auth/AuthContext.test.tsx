import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './AuthContext';
import { useAuth } from './useAuth';
import {
  ApiClientProvider,
  ApiError,
  fixtureFetcher,
} from '@/api-client';
import type { Fetcher } from '@/api-client';
import { AUTH_FIXTURE } from '@/fixtures/data';

function Probe(): React.ReactElement {
  const { token, user, ready, signIn, signOut } = useAuth();
  return (
    <div>
      <span data-testid="token">{token ?? 'none'}</span>
      <span data-testid="user">{user?.email ?? 'anonymous'}</span>
      <span data-testid="ready">{String(ready)}</span>
      <button
        type="button"
        onClick={() => {
          void signIn({ email: 'wren@example.com', password: '12345678' });
        }}
      >
        sign-in
      </button>
      <button type="button" onClick={() => void signOut()}>
        sign-out
      </button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts unauthenticated when no token is stored', async () => {
    const fetcher: Fetcher = async () => undefined;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ApiClientProvider fetcher={fetcher}>
            <MemoryRouter>
              <Probe />
            </MemoryRouter>
          </ApiClientProvider>
        </AuthProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('ready').textContent).toBe('true');
    });
    expect(screen.getByTestId('token').textContent).toBe('none');
    expect(screen.getByTestId('user').textContent).toBe('anonymous');
  });

  it('hydrates the user from the stored token on mount', async () => {
    window.localStorage.setItem('storyteller.session.token', AUTH_FIXTURE.token);
    const fetcher: Fetcher = async (path) => {
      if (path === '/auth/me') return AUTH_FIXTURE.user;
      return undefined;
    };
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ApiClientProvider fetcher={fetcher}>
            <MemoryRouter>
              <Probe />
            </MemoryRouter>
          </ApiClientProvider>
        </AuthProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe(AUTH_FIXTURE.user.email);
    });
    expect(screen.getByTestId('token').textContent).toBe(AUTH_FIXTURE.token);
  });

  it('drops the stored token when /api/auth/me rejects', async () => {
    window.localStorage.setItem('storyteller.session.token', 'revoked-token');
    const fetcher: Fetcher = async () => {
      throw new ApiError(401, { message: 'Unauthenticated', code: 'unauthenticated' });
    };
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ApiClientProvider fetcher={fetcher}>
            <MemoryRouter>
              <Probe />
            </MemoryRouter>
          </ApiClientProvider>
        </AuthProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('ready').textContent).toBe('true');
    });
    expect(screen.getByTestId('token').textContent).toBe('none');
    expect(window.localStorage.getItem('storyteller.session.token')).toBeNull();
  });

  it('persists the token on signIn and clears it on signOut', async () => {
    const fetcher: Fetcher = fixtureFetcher();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ApiClientProvider fetcher={fetcher}>
            <MemoryRouter>
              <Probe />
            </MemoryRouter>
          </ApiClientProvider>
        </AuthProvider>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /sign-in/i }));
    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe(AUTH_FIXTURE.user.email);
    });
    expect(window.localStorage.getItem('storyteller.session.token')).toBe(AUTH_FIXTURE.token);

    fireEvent.click(screen.getByRole('button', { name: /sign-out/i }));
    await waitFor(() => {
      expect(screen.getByTestId('token').textContent).toBe('none');
    });
    expect(window.localStorage.getItem('storyteller.session.token')).toBeNull();
  });
});
