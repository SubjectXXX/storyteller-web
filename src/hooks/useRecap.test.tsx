import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ApiClientProvider,
  ApiError,
  RECAP_FIXTURE,
  type Fetcher,
} from '@/api-client';
import { useRecap } from './useRecap';
import { AuthProvider } from '@/auth/AuthContext';

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

describe('useRecap', () => {
  it('returns the recap resource on success', async () => {
    const fetcher: Fetcher = async () => RECAP_FIXTURE;
    const { result } = renderHook(() => useRecap(RECAP_FIXTURE.adventure_id), {
      wrapper: makeWrapper(fetcher),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.turns).toHaveLength(RECAP_FIXTURE.turns.length);
  });

  it('does not run when the adventure id is missing', () => {
    const fetcher: Fetcher = async () => {
      throw new Error('should not be called');
    };
    const { result } = renderHook(() => useRecap(undefined), {
      wrapper: makeWrapper(fetcher),
    });
    expect(result.current.isFetching).toBe(false);
  });

  it('surfaces 404 — Stage 5 placeholder path', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(404, { message: 'Coming in Stage 5', code: 'not_implemented' });
    };
    const { result } = renderHook(() => useRecap(7), {
      wrapper: makeWrapper(fetcher),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).status).toBe(404);
  });
});
