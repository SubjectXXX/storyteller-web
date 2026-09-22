import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { settingsKeys, useSettings, useUpdateSettings } from './useSettings';
import {
  ApiClientProvider,
  ApiError,
} from '@/api-client';
import type { Fetcher } from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import { SETTINGS_RESOURCE_FIXTURE } from '@/fixtures/data';

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

describe('useSettings', () => {
  it('returns the settings resource on success', async () => {
    const fetcher: Fetcher = async () => SETTINGS_RESOURCE_FIXTURE;
    const { result } = renderHook(() => useSettings(), { wrapper: makeWrapper(fetcher) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.theme).toMatch(/^(light|dark|system)$/);
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
        return SETTINGS_RESOURCE_FIXTURE;
      }
      return { ...SETTINGS_RESOURCE_FIXTURE, ...((options.body ?? {}) as Partial<typeof SETTINGS_RESOURCE_FIXTURE>) };
    };
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }): ReactElement => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ApiClientProvider fetcher={fetcher}>{children}</ApiClientProvider>
        </AuthProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useUpdateSettings(), { wrapper });
    act(() => {
      result.current.mutate({ theme: 'dark' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const putCall = calls.find((c) => c.method === 'PUT' && c.path === '/me/settings');
    expect(putCall).toBeDefined();
    const cached = queryClient.getQueryData(settingsKeys.me()) as
      | { theme: string }
      | undefined;
    expect(cached?.theme).toBe('dark');
  });

  it('surfaces the API error when the PUT fails', async () => {
    const fetcher: Fetcher = async (_path, options = {}) => {
      if ((options.method ?? 'GET') === 'PUT') {
        throw new ApiError(422, { message: 'Validation failed', code: 'invalid_payload' });
      }
      return SETTINGS_RESOURCE_FIXTURE;
    };
    const { result } = renderHook(() => useUpdateSettings(), { wrapper: makeWrapper(fetcher) });
    act(() => {
      result.current.mutate({ theme: 'dark' });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).code).toBe('invalid_payload');
  });
});
