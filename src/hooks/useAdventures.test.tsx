import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  adventureKeys,
  useAdventure,
  useAdventureStream,
  useAdventures,
  useCreateBranch,
  useStartAdventure,
  useSubmitTurn,
} from './useAdventures';
import {
  ApiClientProvider,
  ApiError,
  makeFixtureStream,
} from '@/api-client';
import type { Fetcher, StreamEvent } from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import { ADVENTURE_FIXTURE, ADVENTURE_LIST_FIXTURE, AUTH_FIXTURE, TURN_FIXTURE } from '@/fixtures/data';

function makeWrapper(fetcher: Fetcher, options: { withToken?: boolean } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // R24 DI-4: `useAdventures` is now gated on a hydrated bearer token, so
  // tests that exercise the list query must pre-populate localStorage.
  // The `withToken: false` (default) form is reserved for the negative
  // "does not fetch when signed out" assertion.
  if (options.withToken) {
    window.localStorage.setItem('storyteller.session.token', AUTH_FIXTURE.token);
  } else {
    window.localStorage.removeItem('storyteller.session.token');
  }
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
    const { result } = renderHook(() => useAdventures(), {
      wrapper: makeWrapper(fetcher, { withToken: true }),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.id).toBe(ADVENTURE_FIXTURE.id);
    expect(result.current.data?.[0]?.status).toBe('active');
  });

  it('surfaces the API error', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(401, { message: 'Unauthenticated', code: 'unauthenticated' });
    };
    const { result } = renderHook(() => useAdventures(), {
      wrapper: makeWrapper(fetcher, { withToken: true }),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).code).toBe('unauthenticated');
  });

  // R24 DI-4: TopNav mounts the list query on every route (including
  // /web/login). The hook must stay silent when no bearer token is
  // hydrated, otherwise we leak a 401 every time a signed-out visitor
  // hits the login screen.
  it('does not fetch the list when no token is hydrated', async () => {
    const fetcher: Fetcher = vi.fn(async () => ADVENTURE_LIST_FIXTURE);
    const { result } = renderHook(() => useAdventures(), { wrapper: makeWrapper(fetcher) });
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
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

describe('useAdventureStream', () => {
  function makeStreamWrapper(events: ReadonlyArray<StreamEvent>) {
    const fetcher: Fetcher = async (path) => {
      if (path.startsWith('/adventures/101/stream')) {
        return makeFixtureStream(events);
      }
      return undefined;
    };
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

  it('buffers narration, captures usage, and clears the streaming flag on end', async () => {
    const events: StreamEvent[] = [
      { type: 'turn', turn_id: 9, chunk_index: 0, narration: 'Once ' },
      { type: 'turn', turn_id: 9, chunk_index: 1, narration: 'upon ' },
      {
        type: 'usage',
        input_tokens: 12,
        output_tokens: 34,
        total_tokens: 46,
        latency_ms: 1234,
        model: 'qwen2.5-7b-instruct',
        finish_reason: 'stop',
        cost_credits: 1,
      },
      { type: 'end' },
    ];
    const { result } = renderHook(() => useAdventureStream(101), {
      wrapper: makeStreamWrapper(events),
    });
    await waitFor(() => expect(result.current.streaming).toBe(false));
    expect(result.current.liveNarration).toBe('Once upon ');
    expect(result.current.liveTurnId).toBe(9);
    expect(result.current.liveChunkIndex).toBe(1);
    expect(result.current.usage?.totalTokens).toBe(46);
    expect(result.current.error).toBeNull();
  });

  it('captures the onTurn, onUsage, and onEnd callbacks when supplied', async () => {
    const events: StreamEvent[] = [
      { type: 'turn', turn_id: 1, chunk_index: 0, narration: 'a' },
      {
        type: 'usage',
        input_tokens: 1,
        output_tokens: 1,
        total_tokens: 2,
        latency_ms: 1,
        model: 'm',
        finish_reason: 'stop',
        cost_credits: 0,
      },
      { type: 'end' },
    ];
    const onTurn = vi.fn();
    const onUsage = vi.fn();
    const onEnd = vi.fn();
    renderHook(
      () => useAdventureStream(101, { onTurn, onUsage, onEnd }),
      { wrapper: makeStreamWrapper(events) },
    );
    await waitFor(() => expect(onEnd).toHaveBeenCalledTimes(1));
    expect(onTurn).toHaveBeenCalledTimes(1);
    expect(onUsage).toHaveBeenCalledTimes(1);
  });

  it('cancels the underlying fetch on unmount without throwing', async () => {
    const fetcher: Fetcher = async () => {
      // Never resolve — simulates an open SSE stream.
      await new Promise(() => {});
      return new Response('', { status: 200 });
    };
    const wrapper = makeWrapper(fetcher);
    const { unmount, result } = renderHook(() => useAdventureStream(101), { wrapper });
    // Wait for the hook to flip `streaming` to true before unmounting so
    // we cover the cancellation path of an active subscription.
    await waitFor(() => expect(result.current.streaming).toBe(true));
    expect(() => unmount()).not.toThrow();
  });

  it('returns a clean state when the id is undefined', () => {
    const wrapper = makeWrapper(async () => undefined);
    const { result } = renderHook(() => useAdventureStream(undefined), { wrapper });
    expect(result.current.streaming).toBe(false);
    expect(result.current.liveNarration).toBe('');
    expect(result.current.usage).toBeNull();
  });

  it('skips the fetch entirely when enabled is false', async () => {
    const fetcher: Fetcher = vi.fn(async () => makeFixtureStream([]));
    const wrapper = makeWrapper(fetcher);
    const { result } = renderHook(() => useAdventureStream(101, { enabled: false }), { wrapper });
    // Wait a tick to let any effect run; `streaming` must stay false.
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.streaming).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('exposes error and clears streaming when the stream emits an error', async () => {
    const events: StreamEvent[] = [{ type: 'error', message: 'rate_limited', code: 'rate_limited' }];
    const { result } = renderHook(() => useAdventureStream(101), {
      wrapper: makeStreamWrapper(events),
    });
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.streaming).toBe(false);
    expect(result.current.error?.message).toBe('rate_limited');
  });
});
