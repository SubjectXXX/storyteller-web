import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  scenarioKeys,
  useScenario,
  useScenarios,
} from './useScenarios';
import {
  ApiClientProvider,
  ApiError,
} from '@/api-client';
import type { Fetcher } from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import { SCENARIO_RESOURCE_FIXTURES } from '@/fixtures/data';

function makeWrapper(fetcher: Fetcher) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // `<AuthProvider>` calls `useNavigate()`, so the router has to sit above it.
  return ({ children }: { children: ReactNode }): ReactElement => (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ApiClientProvider fetcher={fetcher}>{children}</ApiClientProvider>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>
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
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ApiClientProvider fetcher={fetcher}>{children}</ApiClientProvider>
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>
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

describe('play-turn surface (removed)', () => {
  it('exposes no play-turn hook — the API has no /scenarios/{slug}/play-turn route', async () => {
    const mod = (await import('./useScenarios')) as unknown as Record<string, unknown>;
    expect(mod.usePlayTurn).toBeUndefined();
    expect(mod.useSubmitChoice).toBeUndefined();
  });

  it('keys the scenario detail query by slug', () => {
    expect(scenarioKeys.detail('demo-romance')).toEqual(['scenarios', 'detail', 'demo-romance']);
  });
});
