import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ApiClientProvider,
  ApiError,
  CHARACTER_FIXTURE,
  type Fetcher,
} from '@/api-client';
import { useCharacter } from './useCharacter';
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

describe('useCharacter', () => {
  it('returns the active character resource on success', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === `/adventures/${CHARACTER_FIXTURE.adventure_id}/character`) {
        return CHARACTER_FIXTURE;
      }
      return undefined;
    };
    const { result } = renderHook(() => useCharacter(CHARACTER_FIXTURE.adventure_id), {
      wrapper: makeWrapper(fetcher),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe(CHARACTER_FIXTURE.name);
    expect(result.current.data?.stats).toHaveLength(CHARACTER_FIXTURE.stats.length);
  });

  it('does not run the query when the adventure id is missing', () => {
    const fetcher: Fetcher = async () => {
      throw new Error('should not be called without an id');
    };
    const { result } = renderHook(() => useCharacter(undefined), {
      wrapper: makeWrapper(fetcher),
    });
    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('surfaces the API error', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(503, {
        message: 'Character backend offline',
        code: 'character_unavailable',
      });
    };
    const { result } = renderHook(() => useCharacter(CHARACTER_FIXTURE.adventure_id), {
      wrapper: makeWrapper(fetcher),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).code).toBe('character_unavailable');
  });
});
