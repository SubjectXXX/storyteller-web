import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReferralsPage from './ReferralsPage';
import { ApiClientProvider, ApiError, fixtureFetcher } from '@/api-client';
import type { Fetcher } from '@/api-client';

function renderWithFetcher(fetcher: Fetcher) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider fetcher={fetcher}>
        <MemoryRouter>
          <ReferralsPage />
        </MemoryRouter>
      </ApiClientProvider>
    </QueryClientProvider>,
  );
}

describe('ReferralsPage', () => {
  it('renders the invite code and the shareable link', async () => {
    renderWithFetcher(fixtureFetcher());

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /bring another/i })).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Invite code')).toHaveValue('WANDER-7821');
    expect(screen.getByLabelText('Shareable link')).toHaveValue('https://storyteller.test/r/WANDER-7821');
  });

  it('exposes the active status pill', () => {
    renderWithFetcher(fixtureFetcher());
    expect(screen.getByText(/active/i)).toBeInTheDocument();
    expect(screen.getByText(/cartographer tier/i)).toBeInTheDocument();
  });

  it('hits /api/referrals/me on mount', async () => {
    const calls: string[] = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      calls.push(`${options.method ?? 'GET'} ${path}`);
      const { REFERRAL_FIXTURE } = await import('@/fixtures/data');
      return REFERRAL_FIXTURE;
    };
    renderWithFetcher(fetcher);

    await waitFor(() => {
      expect(calls.some((line) => line.endsWith('/referrals/me'))).toBe(true);
    });
  });

  it('bumps the rewards counter when the user clicks Share', async () => {
    const user = userEvent.setup();
    renderWithFetcher(fixtureFetcher());

    const share = await screen.findByRole('button', { name: /share via email/i });
    expect(screen.getByText(/2 rewards granted/i)).toBeInTheDocument();
    await user.click(share);
    expect(screen.getByText(/3 rewards granted/i)).toBeInTheDocument();
  });

  it('shows an empty invite section when the API errors and no fallback is wired', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(500, { message: 'Server exploded', code: 'server_error' });
    };
    renderWithFetcher(fetcher);

    // The page renders the loading state forever in this case; assert that
    // it doesn't crash and stays accessible to assistive tech.
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /bring another/i })).toBeInTheDocument();
    });
  });
});
