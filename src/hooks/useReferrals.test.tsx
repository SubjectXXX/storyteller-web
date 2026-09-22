import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReferral, useShareReferral } from './useReferrals';
import {
  ApiClientProvider,
  ApiError,
} from '@/api-client';
import type { Fetcher } from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import { REFERRAL_RESOURCE_FIXTURE } from '@/fixtures/data';

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

describe('useReferral', () => {
  it('returns the referral code on success', async () => {
    const fetcher: Fetcher = async () => REFERRAL_RESOURCE_FIXTURE;
    const { result } = renderHook(() => useReferral(), { wrapper: makeWrapper(fetcher) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.code).toMatch(/^[A-Z0-9-]+$/);
    expect(result.current.data?.count).toBeGreaterThanOrEqual(0);
  });

  it('surfaces the API error without crashing', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(404, { message: 'Not Found', code: 'no_referral' });
    };
    const { result } = renderHook(() => useReferral(), { wrapper: makeWrapper(fetcher) });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).code).toBe('no_referral');
  });
});

describe('useShareReferral', () => {
  it('POSTs /api/referrals/share and caches the response', async () => {
    const calls: string[] = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      const method = options.method ?? 'GET';
      calls.push(`${method} ${path}`);
      if (path === '/referrals/me' && method === 'GET') {
        return REFERRAL_RESOURCE_FIXTURE;
      }
      if (path === '/referrals/share' && method === 'POST') {
        return { ...REFERRAL_RESOURCE_FIXTURE, count: REFERRAL_RESOURCE_FIXTURE.count + 1 };
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
    const { result } = renderHook(() => useShareReferral(), { wrapper });
    result.current.mutate({ channel: 'email' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(calls).toContain('POST /referrals/share');
  });

  it('surfaces the API error when share fails', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(422, { message: 'Invalid channel', code: 'validation' });
    };
    const { result } = renderHook(() => useShareReferral(), { wrapper: makeWrapper(fetcher) });
    result.current.mutate({ channel: 'email' });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).code).toBe('validation');
  });
});
