import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ApiClientProvider,
  ApiError,
  NPC_ROSTER_FIXTURE,
  type Fetcher,
} from '@/api-client';
import { useNpcRoster } from './useNpcRoster';
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

describe('useNpcRoster', () => {
  it('returns the NPC roster on success', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === `/adventures/${NPC_ROSTER_FIXTURE[0]!.id}/npcs` || path === '/adventures/1234/npcs') {
        return NPC_ROSTER_FIXTURE;
      }
      return undefined;
    };
    const { result } = renderHook(() => useNpcRoster(1234), {
      wrapper: makeWrapper(fetcher),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(NPC_ROSTER_FIXTURE.length);
    expect(result.current.data?.[0]?.name).toBe(NPC_ROSTER_FIXTURE[0]!.name);
  });

  it('does not run when the adventure id is missing', () => {
    const fetcher: Fetcher = async () => {
      throw new Error('should not be called');
    };
    const { result } = renderHook(() => useNpcRoster(undefined), {
      wrapper: makeWrapper(fetcher),
    });
    expect(result.current.isFetching).toBe(false);
  });

  it('surfaces the API error', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(500, { message: 'Database busy', code: 'db_busy' });
    };
    const { result } = renderHook(() => useNpcRoster(1234), {
      wrapper: makeWrapper(fetcher),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).code).toBe('db_busy');
  });
});
