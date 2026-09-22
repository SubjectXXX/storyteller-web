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
import { ADVENTURE_FIXTURE, ADVENTURE_LIST_FIXTURE } from '@/fixtures/data';

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
});
