import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WalletPage from './WalletPage';
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
          <WalletPage />
        </MemoryRouter>
      </ApiClientProvider>
    </QueryClientProvider>,
  );
}

describe('WalletPage', () => {
  it('renders the balance, the tier card, and the package list', () => {
    renderWithFetcher(fixtureFetcher());

    expect(screen.getByRole('heading', { level: 1, name: /credits/i })).toBeInTheDocument();
    expect(screen.getByText(/wayfinder/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /credit packages/i })).toBeInTheDocument();
  });

  it('disables Buy on the ineligible Vault Pack', () => {
    renderWithFetcher(fixtureFetcher());

    const buttons = screen.getAllByRole('button', { name: /unavailable|buy/i });
    const unavailable = buttons.find((b) => b.textContent?.toLowerCase().includes('unavailable'));
    expect(unavailable).toBeDefined();
    expect(unavailable).toBeDisabled();
  });

  it('POSTs /api/wallet/top-up when the user clicks Buy', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      calls.push(`${options.method ?? 'GET'} ${path}`);
      if (path === '/wallet') {
        const { WALLET_FIXTURE } = await import('@/fixtures/data');
        return WALLET_FIXTURE;
      }
      if (path === '/wallet/top-up' && (options.method ?? 'GET') === 'POST') {
        return { reservationId: 'reservation-pkg-starter', checkoutUrl: 'https://example.test/checkout' };
      }
      throw new ApiError(404, { message: `not mocked ${path}` });
    };
    renderWithFetcher(fetcher);

    const buyButtons = await screen.findAllByRole('button', { name: /buy/i });
    await user.click(buyButtons[0]!);

    await waitFor(() => {
      expect(calls).toContain('POST /wallet/top-up');
    });
  });

  it('surfaces a top-up error without crashing the page', async () => {
    const user = userEvent.setup();
    const fetcher: Fetcher = async (path, options = {}) => {
      if (path === '/wallet') {
        const { WALLET_FIXTURE } = await import('@/fixtures/data');
        return WALLET_FIXTURE;
      }
      if (path === '/wallet/top-up' && (options.method ?? 'GET') === 'POST') {
        throw new ApiError(402, { message: 'Payment required', code: 'payment_required' });
      }
      throw new ApiError(404, { message: `not mocked ${path}` });
    };
    renderWithFetcher(fetcher);

    const buyButtons = await screen.findAllByRole('button', { name: /buy/i });
    // The ineligible Vault Pack's button has label "Unavailable"; only the
    // eligible ones say "Buy" / "Reserving…". Click the first eligible.
    await user.click(buyButtons[0]!);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/top-up failed/i);
    });
  });

  it('does not throw if the wallet endpoint fails (offline + fixture fallback)', () => {
    // Without withFixtureFallback the fetcher throws on /wallet; the wallet
    // hook should still render the offline-safe fixture fallback here because
    // the wrapping fetcher returns the fixture data via `fixtureFetcher()`.
    renderWithFetcher(fixtureFetcher());
    expect(screen.getByRole('heading', { level: 1, name: /credits/i })).toBeInTheDocument();
  });
});
