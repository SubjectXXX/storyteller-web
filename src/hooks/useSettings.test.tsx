import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { settingsKeys, useSettings, useUpdateSettings } from './useSettings';
import { ApiClientProvider, ApiError } from '@/api-client';
import type { Fetcher } from '@/api-client';
import { SETTINGS_FIXTURE } from '@/fixtures/data';

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

describe('useSettings', () => {
  it('returns the settings groups on success', async () => {
    const fetcher: Fetcher = async () => {
      const { SETTINGS_FIXTURE } = await import('@/fixtures/data');
      return SETTINGS_FIXTURE;
    };
    const { result } = renderHook(() => useSettings(), { wrapper: makeWrapper(fetcher) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.length).toBe(3);
  });

  it('surfaces the API error', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(401, { message: 'Unauthenticated' });
    };
    const { result } = renderHook(() => useSettings(), { wrapper: makeWrapper(fetcher) });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).status).toBe(401);
  });
});

describe('useUpdateSettings', () => {
  it('writes to /api/me/settings and updates the cache on success', async () => {
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      const method = options.method ?? 'GET';
      calls.push({ method, path, body: options.body });
      if (method === 'GET') {
        const { SETTINGS_FIXTURE } = await import('@/fixtures/data');
        return SETTINGS_FIXTURE;
      }
      return { groups: options.body };
    };
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactElement }): ReactElement => (
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider fetcher={fetcher}>{children}</ApiClientProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useUpdateSettings(), { wrapper });
    act(() => {
      result.current.mutate({ groups: SETTINGS_FIXTURE });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const putCall = calls.find((c) => c.method === 'PUT' && c.path === '/me/settings');
    expect(putCall).toBeDefined();
    expect(queryClient.getQueryData(settingsKeys.me())).toBeDefined();
  });

  it('surfaces the API error when the PUT fails', async () => {
    const fetcher: Fetcher = async (_path, options = {}) => {
      if ((options.method ?? 'GET') === 'PUT') {
        throw new ApiError(422, { message: 'Validation failed', code: 'invalid_payload' });
      }
      const { SETTINGS_FIXTURE } = await import('@/fixtures/data');
      return SETTINGS_FIXTURE;
    };
    const { result } = renderHook(() => useUpdateSettings(), { wrapper: makeWrapper(fetcher) });
    act(() => {
      result.current.mutate({ groups: SETTINGS_FIXTURE });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).code).toBe('invalid_payload');
  });
});
