import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTopUpWallet, useWallet, walletKeys } from './useWallet';
import { ApiClientProvider, ApiError } from '@/api-client';
import type { Fetcher } from '@/api-client';

function makeWrapper(fetcher: Fetcher) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactElement }): ReactElement => (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider fetcher={fetcher}>{children}</ApiClientProvider>
    </QueryClientProvider>
  );
}

describe('useWallet', () => {
  it('returns the wallet on success', async () => {
    const fetcher: Fetcher = async () => {
      const { WALLET_FIXTURE } = await import('@/fixtures/data');
      return WALLET_FIXTURE;
    };
    const { result } = renderHook(() => useWallet(), { wrapper: makeWrapper(fetcher) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.balanceCredits).toBeGreaterThanOrEqual(0);
    expect(result.current.data?.packages.length).toBeGreaterThan(0);
  });

  it('surfaces the API error', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(401, { message: 'Unauthenticated', code: 'unauthenticated' });
    };
    const { result } = renderHook(() => useWallet(), { wrapper: makeWrapper(fetcher) });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).code).toBe('unauthenticated');
  });
});

describe('useTopUpWallet', () => {
  it('returns the checkout URL on success', async () => {
    const fetcher: Fetcher = async (path, options = {}) => {
      if (path === '/wallet/top-up' && (options.method ?? 'GET') === 'POST') {
        return { reservationId: 'res-1', checkoutUrl: 'https://example.test/co' };
      }
      return undefined;
    };
    const { result } = renderHook(() => useTopUpWallet(), {
      wrapper: makeWrapper(fetcher),
    });
    result.current.mutate({ packageId: 'pkg-starter' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.checkoutUrl).toContain('example.test/co');
  });

  it('returns the error when the top-up is rejected', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(402, { message: 'Payment required', code: 'payment_required' });
    };
    const { result } = renderHook(() => useTopUpWallet(), {
      wrapper: makeWrapper(fetcher),
    });
    result.current.mutate({ packageId: 'pkg-starter' });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).status).toBe(402);
  });

  it('invalidates the wallet cache after a successful top-up', async () => {
    const calls: string[] = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      const method = options.method ?? 'GET';
      calls.push(`${method} ${path}`);
      if (path === '/wallet' && method === 'GET') {
        const { WALLET_FIXTURE } = await import('@/fixtures/data');
        return WALLET_FIXTURE;
      }
      if (path === '/wallet/top-up' && method === 'POST') {
        return { reservationId: 'res-1', checkoutUrl: 'https://example.test/co' };
      }
      return undefined;
    };
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactElement }): ReactElement => (
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider fetcher={fetcher}>{children}</ApiClientProvider>
      </QueryClientProvider>
    );
    const hook = renderHook(
      () => ({ wallet: useWallet(), topUp: useTopUpWallet() }),
      { wrapper },
    );
    // Prime the wallet query.
    await waitFor(() => expect(hook.result.current.wallet.isSuccess).toBe(true));
    expect(queryClient.getQueryData(walletKeys.me())).toBeDefined();
    calls.length = 0;

    hook.result.current.topUp.mutate({ packageId: 'pkg-starter' });
    await waitFor(() => expect(hook.result.current.topUp.isSuccess).toBe(true));

    // Top-up success invalidates `walletKeys.all`, so a subsequent read should
    // re-fetch `/wallet`.
    await waitFor(() => expect(calls.filter((c) => c.endsWith('/wallet')).length).toBeGreaterThan(0));
  });
});
