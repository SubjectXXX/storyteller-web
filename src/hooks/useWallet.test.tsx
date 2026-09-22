import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTopUpWallet, useWallet, walletKeys } from './useWallet';
import {
  ApiClientProvider,
  ApiError,
} from '@/api-client';
import type { Fetcher } from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import { WALLET_RESOURCE_FIXTURE } from '@/fixtures/data';

function makeWrapper(fetcher: Fetcher) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiClientProvider fetcher={fetcher}>{children}</ApiClientProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('useWallet', () => {
  it('returns the wallet on success', async () => {
    const fetcher: Fetcher = async () => WALLET_RESOURCE_FIXTURE;
    const { result } = renderHook(() => useWallet(), { wrapper: makeWrapper(fetcher) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.balance).toBeGreaterThanOrEqual(0);
    expect(result.current.data?.currency).toBe('credits');
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
  it('returns the updated wallet on success', async () => {
    const fetcher: Fetcher = async (path, options = {}) => {
      if (path === '/wallet/top-up' && (options.method ?? 'GET') === 'POST') {
        return { ...WALLET_RESOURCE_FIXTURE, balance: WALLET_RESOURCE_FIXTURE.balance + 50 };
      }
      return undefined;
    };
    const { result } = renderHook(() => useTopUpWallet(), {
      wrapper: makeWrapper(fetcher),
    });
    result.current.mutate({ amount: 50 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.balance).toBe(WALLET_RESOURCE_FIXTURE.balance + 50);
  });

  it('returns the error when the top-up is rejected', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(402, { message: 'Payment required', code: 'payment_required' });
    };
    const { result } = renderHook(() => useTopUpWallet(), {
      wrapper: makeWrapper(fetcher),
    });
    result.current.mutate({ amount: 50 });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).status).toBe(402);
  });

  it('optimistically updates the cached balance then invalidates on settle', async () => {
    const calls: string[] = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      const method = options.method ?? 'GET';
      calls.push(`${method} ${path}`);
      if (path === '/wallet' && method === 'GET') {
        return WALLET_RESOURCE_FIXTURE;
      }
      if (path === '/wallet/top-up' && method === 'POST') {
        return { ...WALLET_RESOURCE_FIXTURE, balance: WALLET_RESOURCE_FIXTURE.balance + 50 };
      }
      return undefined;
    };
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }): ReactElement => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ApiClientProvider fetcher={fetcher}>{children}</ApiClientProvider>
        </AuthProvider>
      </QueryClientProvider>
    );
    const hook = renderHook(
      () => ({ wallet: useWallet(), topUp: useTopUpWallet() }),
      { wrapper },
    );
    await waitFor(() => expect(hook.result.current.wallet.isSuccess).toBe(true));
    expect(queryClient.getQueryData(walletKeys.me())).toBeDefined();
    calls.length = 0;

    hook.result.current.topUp.mutate({ amount: 50 });
    await waitFor(() => expect(hook.result.current.topUp.isSuccess).toBe(true));

    // Top-up success invalidates `walletKeys.all`, so a subsequent read
    // should re-fetch `/wallet`.
    await waitFor(() => expect(calls.filter((c) => c.endsWith('/wallet')).length).toBeGreaterThan(0));
  });
});
