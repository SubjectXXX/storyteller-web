import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReferralsPage from './ReferralsPage';
import {
  ApiClientProvider,
  ApiError,
  fixtureFetcher,
} from '@/api-client';
import type { Fetcher } from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import { REFERRAL_RESOURCE_FIXTURE } from '@/fixtures/data';

function renderWithFetcher(fetcher: Fetcher) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiClientProvider fetcher={fetcher}>
          <MemoryRouter>
            <ReferralsPage />
          </MemoryRouter>
        </ApiClientProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('ReferralsPage', () => {
  it('renders the invite code and the shareable link', async () => {
    renderWithFetcher(fixtureFetcher());

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /bring another/i })).toBeTruthy();
    });
    expect((screen.getByLabelText('Invite code') as HTMLInputElement).value).toBe(
      REFERRAL_RESOURCE_FIXTURE.code,
    );
    expect((screen.getByLabelText('Shareable link') as HTMLInputElement).value).toBe(
      `https://storyteller.test/r/${REFERRAL_RESOURCE_FIXTURE.code}`,
    );
  });

  it('hits /api/referrals/me on mount', async () => {
    const calls: string[] = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      calls.push(`${options.method ?? 'GET'} ${path}`);
      return REFERRAL_RESOURCE_FIXTURE;
    };
    renderWithFetcher(fetcher);

    await waitFor(() => {
      expect(calls.some((line) => line.endsWith('/referrals/me'))).toBe(true);
    });
  });

  it('POSTs /api/referrals/share when the user clicks Share', async () => {
    const calls: string[] = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      const method = options.method ?? 'GET';
      calls.push(`${method} ${path}`);
      if (path === '/referrals/me' && method === 'GET') return REFERRAL_RESOURCE_FIXTURE;
      if (path === '/referrals/share' && method === 'POST') {
        return { ...REFERRAL_RESOURCE_FIXTURE, count: REFERRAL_RESOURCE_FIXTURE.count + 1 };
      }
      return undefined;
    };
    renderWithFetcher(fetcher);

    const share = await screen.findByRole('button', { name: /share via email/i });
    fireEvent.click(share);

    await waitFor(() => {
      expect(calls).toContain('POST /referrals/share');
    });
  });

  it('surfaces the share error', async () => {
    const fetcher: Fetcher = async (path, options = {}) => {
      const method = options.method ?? 'GET';
      if (path === '/referrals/me' && method === 'GET') return REFERRAL_RESOURCE_FIXTURE;
      if (path === '/referrals/share' && method === 'POST') {
        throw new ApiError(422, { message: 'Invalid channel', code: 'validation' });
      }
      return undefined;
    };
    renderWithFetcher(fetcher);

    const share = await screen.findByRole('button', { name: /share via email/i });
    fireEvent.click(share);

    await waitFor(() => {
      const alert = screen.queryByRole('alert');
      expect(alert?.textContent).toMatch(/share failed/i);
    });
  });

  it('renders the invite section when the API errors (no crash)', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(500, { message: 'Server exploded', code: 'server_error' });
    };
    renderWithFetcher(fetcher);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /bring another/i })).toBeTruthy();
    });
  });
});
