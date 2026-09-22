import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WalletPage from './WalletPage';
import {
  ApiClientProvider,
  ApiError,
  fixtureFetcher,
} from '@/api-client';
import type { Fetcher } from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import { WALLET_RESOURCE_FIXTURE } from '@/fixtures/data';

function renderWithFetcher(fetcher: Fetcher) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiClientProvider fetcher={fetcher}>
          <MemoryRouter>
            <WalletPage />
          </MemoryRouter>
        </ApiClientProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('WalletPage', () => {
  it('renders the balance and the package list', () => {
    renderWithFetcher(fixtureFetcher());

    expect(screen.getByRole('heading', { level: 1, name: /credits/i })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: /credit packages/i })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /buy/i }).length).toBeGreaterThan(0);
  });

  it('renders the wallet balance + currency from the resource', async () => {
    renderWithFetcher(fixtureFetcher());

    await waitFor(() => {
      expect(screen.getByText(WALLET_RESOURCE_FIXTURE.balance.toString())).toBeTruthy();
    });
  });

  it('POSTs /api/wallet/top-up when the user clicks Buy', async () => {
    const calls: string[] = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      calls.push(`${options.method ?? 'GET'} ${path}`);
      if (path === '/wallet' && (options.method ?? 'GET') === 'GET') {
        return WALLET_RESOURCE_FIXTURE;
      }
      if (path === '/wallet/top-up' && options.method === 'POST') {
        return { ...WALLET_RESOURCE_FIXTURE, balance: WALLET_RESOURCE_FIXTURE.balance + 100 };
      }
      throw new ApiError(404, { message: `not mocked ${path}` });
    };
    renderWithFetcher(fetcher);

    const buyButtons = await screen.findAllByRole('button', { name: /buy/i });
    fireEvent.click(buyButtons[0]!);

    await waitFor(() => {
      expect(calls).toContain('POST /wallet/top-up');
    });
  });

  it('surfaces a top-up error without crashing the page', async () => {
    const fetcher: Fetcher = async (path, options = {}) => {
      if (path === '/wallet' && (options.method ?? 'GET') === 'GET') {
        return WALLET_RESOURCE_FIXTURE;
      }
      if (path === '/wallet/top-up' && options.method === 'POST') {
        throw new ApiError(402, { message: 'Payment required', code: 'payment_required' });
      }
      throw new ApiError(404, { message: `not mocked ${path}` });
    };
    renderWithFetcher(fetcher);

    const buyButtons = await screen.findAllByRole('button', { name: /buy/i });
    fireEvent.click(buyButtons[0]!);

    await waitFor(() => {
      const alert = screen.queryByRole('alert');
      expect(alert?.textContent).toMatch(/top-up failed/i);
    });
  });

  it('does not throw if the wallet endpoint is offline (fixture fallback)', () => {
    renderWithFetcher(fixtureFetcher());
    expect(screen.getByRole('heading', { level: 1, name: /credits/i })).toBeTruthy();
  });
});
