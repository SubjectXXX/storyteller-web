import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReferral } from './useReferrals';
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

describe('useReferral', () => {
  it('returns the referral code on success', async () => {
    const fetcher: Fetcher = async () => {
      const { REFERRAL_FIXTURE } = await import('@/fixtures/data');
      return REFERRAL_FIXTURE;
    };
    const { result } = renderHook(() => useReferral(), { wrapper: makeWrapper(fetcher) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.code).toMatch(/^[A-Z0-9-]+$/);
    expect(result.current.data?.inviterStatus).toBe('active');
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
