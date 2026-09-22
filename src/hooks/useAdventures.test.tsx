import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  adventureKeys,
  useAdventure,
  useAdventures,
  useCreateBranch,
  useStartAdventure,
  useSubmitTurn,
} from './useAdventures';
import {
  ApiClientProvider,
  ApiError,
} from '@/api-client';
import type { Fetcher } from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import { ADVENTURE_FIXTURE, ADVENTURE_LIST_FIXTURE, TURN_FIXTURE } from '@/fixtures/data';

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

describe('useAdventures', () => {
  it('returns the adventure list on success', async () => {
    const fetcher: Fetcher = async () => ADVENTURE_LIST_FIXTURE;
    const { result } = renderHook(() => useAdventures(), { wrapper: makeWrapper(fetcher) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.id).toBe(ADVENTURE_FIXTURE.id);
    expect(result.current.data?.[0]?.status).toBe('active');
  });

  it('surfaces the API error', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(401, { message: 'Unauthenticated', code: 'unauthenticated' });
    };
    const { result } = renderHook(() => useAdventures(), { wrapper: makeWrapper(fetcher) });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).code).toBe('unauthenticated');
  });
});

describe('useAdventure', () => {
  it('returns the adventure detail', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === '/adventures/101') return ADVENTURE_FIXTURE;
      return undefined;
    };
    const { result } = renderHook(() => useAdventure(101), { wrapper: makeWrapper(fetcher) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.current_branch.id).toBe(ADVENTURE_FIXTURE.current_branch.id);
  });

  it('does not run the query when the id is missing', () => {
    const fetcher: Fetcher = async () => {
      throw new Error('should not be called without an id');
    };
    const { result } = renderHook(() => useAdventure(undefined), { wrapper: makeWrapper(fetcher) });
    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('surfaces 404 for an unknown adventure', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(404, { message: 'Not found', code: 'not_found' });
    };
    const { result } = renderHook(() => useAdventure(999), { wrapper: makeWrapper(fetcher) });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).status).toBe(404);
  });
});

describe('useStartAdventure', () => {
  it('POSTs /api/adventures and caches the new adventure', async () => {
    const fetcher: Fetcher = async (_path, options = {}) => {
      if ((options.method ?? 'GET') === 'POST') {
        return ADVENTURE_FIXTURE;
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
    const { result } = renderHook(() => useStartAdventure(), { wrapper });
    result.current.mutate({ scenario_slug: 'demo-mystery' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(adventureKeys.detail(ADVENTURE_FIXTURE.id))).toBeDefined();
  });

  it('surfaces the validation error when scenario_slug is missing', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(422, { message: 'scenario_slug is required.', code: 'validation' });
    };
    const { result } = renderHook(() => useStartAdventure(), { wrapper: makeWrapper(fetcher) });
    result.current.mutate({ scenario_slug: '' });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).code).toBe('validation');
  });
});

describe('useSubmitTurn', () => {
  it('POSTs /api/adventures/:id/turns and invalidates the cache', async () => {
    const calls: string[] = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      const method = options.method ?? 'GET';
      calls.push(`${method} ${path}`);
      if (path === '/adventures/101/turns' && method === 'POST') {
        return TURN_FIXTURE;
      }
      if (path === '/adventures/101' && method === 'GET') {
        return ADVENTURE_FIXTURE;
      }
      return undefined;
    };
    const { result } = renderHook(() => useSubmitTurn(101), { wrapper: makeWrapper(fetcher) });
    result.current.mutate({
      branch_id: 1,
      choice_id: 'choice-alley',
      free_text: null,
      idempotency_key: 'idem-1',
      client_version: 1,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(calls).toContain('POST /adventures/101/turns');
  });

  it('surfaces a 409 version_conflict on stale client_version', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(409, { message: 'stale', code: 'version_conflict' });
    };
    const { result } = renderHook(() => useSubmitTurn(101), { wrapper: makeWrapper(fetcher) });
    result.current.mutate({
      branch_id: 1,
      idempotency_key: 'idem-1',
      client_version: 0,
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).code).toBe('version_conflict');
  });
});

describe('useCreateBranch', () => {
  it('POSTs /api/adventures/:id/branches and invalidates the cache', async () => {
    const fetcher: Fetcher = async (path, options = {}) => {
      const method = options.method ?? 'GET';
      if (path === '/adventures/101/branches' && method === 'POST') {
        return {
          id: 2,
          name: 'fork-1',
          depth: 1,
          version: 1,
          parent_branch_id: 1,
          parent_turn_id: 1,
          state: {},
        };
      }
      return undefined;
    };
    const { result } = renderHook(() => useCreateBranch(101), { wrapper: makeWrapper(fetcher) });
    result.current.mutate({ from_branch_id: 1, from_turn_id: 1, name: 'fork-1' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe('fork-1');
  });
});
