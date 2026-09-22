import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  scenarioKeys,
  useScenario,
  useScenarios,
  usePlayTurn,
} from './useScenarios';
import {
  ApiClientProvider,
  ApiError,
} from '@/api-client';
import type { Fetcher } from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import { SCENARIO_RESOURCE_FIXTURES, PLAY_FIXTURE } from '@/fixtures/data';

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

describe('useScenarios', () => {
  it('returns the live scenario list on success', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === '/scenarios') {
        return SCENARIO_RESOURCE_FIXTURES;
      }
      return undefined;
    };
    const { result } = renderHook(() => useScenarios(), {
      wrapper: makeWrapper(fetcher),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.length).toBeGreaterThanOrEqual(4);
    expect(result.current.data?.find((s) => s.slug === 'demo-romance')).toBeDefined();
  });

  it('returns an ApiError on failure without throwing', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(500, { message: 'Server exploded', code: 'server_error' });
    };
    const { result } = renderHook(() => useScenarios(), { wrapper: makeWrapper(fetcher) });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).status).toBe(500);
  });

  it('uses a unique cache key per filter combination', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path.startsWith('/scenarios')) {
        return SCENARIO_RESOURCE_FIXTURES;
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
    const first = renderHook(() => useScenarios({ rating: 'mature' }), { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    const cachedKey = scenarioKeys.list({ rating: 'mature' });
    expect(queryClient.getQueryData(cachedKey)).toBeDefined();
    const otherKey = scenarioKeys.list({ rating: 'all-ages' });
    expect(queryClient.getQueryData(otherKey)).toBeUndefined();
    queryClient.clear();
  });
});

describe('useScenario', () => {
  it('fetches a single scenario by slug', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === '/scenarios/demo-romance') {
        return SCENARIO_RESOURCE_FIXTURES.find((s) => s.slug === 'demo-romance');
      }
      return undefined;
    };
    const { result } = renderHook(() => useScenario('demo-romance'), {
      wrapper: makeWrapper(fetcher),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.title).toBeTruthy();
  });

  it('does not run the query when the slug is missing', () => {
    const fetcher: Fetcher = async () => {
      throw new Error('should not be called when slug is missing');
    };
    const { result } = renderHook(() => useScenario(undefined), {
      wrapper: makeWrapper(fetcher),
    });
    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });
});

describe('usePlayTurn', () => {
  it('loads the play turn for the active scenario (legacy S1 surface)', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === '/scenarios/demo-romance/play-turn') {
        return PLAY_FIXTURE;
      }
      return undefined;
    };
    const { result } = renderHook(() => usePlayTurn('demo-romance'), {
      wrapper: makeWrapper(fetcher),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.choices.length).toBeGreaterThanOrEqual(2);
  });

  it('surfaces the API error on the play-turn query', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(503, { message: 'down', code: 'down' });
    };
    const { result } = renderHook(() => usePlayTurn('demo-romance'), {
      wrapper: makeWrapper(fetcher),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).status).toBe(503);
  });
});
