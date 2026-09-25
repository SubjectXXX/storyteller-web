import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from './HomePage';
import {
  ApiClientProvider,
  ApiError,
  fixtureFetcher,
} from '@/api-client';
import type { Fetcher } from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import { ADVENTURE_FIXTURE, ADVENTURE_LIST_FIXTURE, AUTH_FIXTURE } from '@/fixtures/data';

function renderWithProviders(fetcher: Fetcher = fixtureFetcher()): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiClientProvider fetcher={fetcher}>
          <MemoryRouter>
            <HomePage />
          </MemoryRouter>
        </ApiClientProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

/**
 * Render HomePage with an authenticated admin user so admin-gated UI
 * (the AI provider pill) is reachable from the tests that exercise it.
 */
function renderAsAdmin(fetcher: Fetcher = fixtureFetcher()): void {
  // Seed a bearer token so AuthProvider resolves the session on mount
  // and calls /auth/me via the provided fetcher.
  window.localStorage.setItem('storyteller.session.token', AUTH_FIXTURE.token);
  renderWithProviders(async (path, init) => {
    if (path === '/auth/me') {
      return { ...AUTH_FIXTURE.user, is_admin: true };
    }
    return fetcher(path, init);
  });
}

describe('HomePage', () => {
  it('renders the welcome header and the featured scenario card', () => {
    renderWithProviders();

    expect(screen.getByRole('heading', { level: 1, name: /welcome/i })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: /a quiet court/i })).toBeTruthy();
  });

  it('links to the scenario library', () => {
    renderWithProviders();
    expect(screen.getByRole('link', { name: /browse scenarios/i }).getAttribute('href')).toBe(
      '/scenarios',
    );
  });

  it('renders the Continue adventure card when the user has an active adventure', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === '/adventures') return ADVENTURE_LIST_FIXTURE;
      return undefined;
    };
    renderWithProviders(fetcher);
    await waitFor(() => {
      expect(screen.getByTestId('continue-adventure')).toBeTruthy();
    });
    expect(
      screen.getByRole('link', { name: /resume/i }).getAttribute('href'),
    ).toBe(`/adventures/${ADVENTURE_FIXTURE.id}`);
  });

  it('hides the Continue adventure card when the API returns no adventures', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === '/adventures') return [];
      return undefined;
    };
    renderWithProviders(fetcher);
    await waitFor(() => {
      expect(screen.queryByTestId('continue-adventure')).toBeNull();
    });
  });

  it('falls back to the featured fixture when the API errors', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(500, { message: 'Server exploded', code: 'server_error' });
    };
    renderWithProviders(fetcher);
    expect(screen.getByRole('heading', { level: 3, name: /a quiet court/i })).toBeTruthy();
  });

  it('renders the LM Studio provider pill when the AI status endpoint reports a reachable LM Studio backend', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === '/admin/ai/status') {
        return {
          provider: 'lmstudio',
          model: 'qwen2.5-7b-instruct',
          base_url: 'http://host.docker.internal:1234/v1',
          reachable: true,
        };
      }
      return undefined;
    };
    renderAsAdmin(fetcher);
    await waitFor(() => {
      expect(screen.getByTestId('ai-provider-pill').textContent).toMatch(
        /Provider: LM Studio \(qwen2\.5-7b-instruct\)/,
      );
    });
  });

  it('renders the unknown provider pill when the AI status endpoint is unreachable', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === '/admin/ai/status') {
        return {
          provider: 'unknown',
          model: 'unknown',
          base_url: '',
          reachable: false,
        };
      }
      return undefined;
    };
    renderAsAdmin(fetcher);
    await waitFor(() => {
      expect(screen.getByTestId('ai-provider-pill').textContent).toMatch(/Provider: unknown/);
    });
  });

  it('hides the AI provider pill when the signed-in user is not an admin', async () => {
    // No token / no user → AuthProvider reports user=null, is_admin gate fails,
    // and the pill must stay out of the DOM even though the AI status endpoint
    // is reachable.
    const fetcher: Fetcher = async (path) => {
      if (path === '/admin/ai/status') {
        return {
          provider: 'lmstudio',
          model: 'qwen2.5-7b-instruct',
          base_url: 'http://host.docker.internal:1234/v1',
          reachable: true,
        };
      }
      return undefined;
    };
    renderWithProviders(fetcher);
    await waitFor(() => {
      expect(screen.queryByTestId('ai-provider-pill')).toBeNull();
    });
  });
});
