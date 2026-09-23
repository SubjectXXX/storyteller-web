import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAiStatus, aiStatusKeys, AI_STATUS_FALLBACK } from './useAiStatus';
import { ApiClientProvider, ApiError } from '@/api-client';
import type { Fetcher } from '@/api-client';
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

describe('useAiStatus', () => {
  it('returns the LM Studio status from the public endpoint', async () => {
    const fetcher: Fetcher = async () => ({
      provider: 'lmstudio',
      model: 'qwen2.5-7b-instruct',
      base_url: 'http://host.docker.internal:1234/v1',
      reachable: true,
    });
    const { result } = renderHook(() => useAiStatus(), { wrapper: makeWrapper(fetcher) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.provider).toBe('lmstudio');
    expect(result.current.data?.reachable).toBe(true);
  });

  it('exposes an error state and keeps the fallback so the UI can render the unknown pill', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(500, { message: 'Server exploded', code: 'server_error' });
    };
    const { result } = renderHook(() => useAiStatus(), { wrapper: makeWrapper(fetcher) });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).code).toBe('server_error');
    // The fallback lives outside the hook so the page can render it
    // even when the query is in `isError` state.
    expect(AI_STATUS_FALLBACK.provider).toBe('unknown');
    expect(AI_STATUS_FALLBACK.reachable).toBe(false);
  });

  it('exposes a stable cache key so the page can invalidate manually', () => {
    expect(aiStatusKeys.status()).toEqual(['ai', 'status']);
    expect(aiStatusKeys.all).toEqual(['ai']);
  });
});
