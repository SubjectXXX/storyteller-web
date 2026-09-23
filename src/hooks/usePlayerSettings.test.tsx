import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ApiClientProvider,
  PLAYER_SETTINGS_FIXTURE,
  type Fetcher,
} from '@/api-client';
import { usePlayerSettings, useUpdatePlayerSettings } from './usePlayerSettings';
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

describe('usePlayerSettings', () => {
  it('returns the player-defaults document on success', async () => {
    const fetcher: Fetcher = async () => PLAYER_SETTINGS_FIXTURE;
    const { result } = renderHook(() => usePlayerSettings(), {
      wrapper: makeWrapper(fetcher),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.narration_verbosity).toBe(
      PLAYER_SETTINGS_FIXTURE.narration_verbosity,
    );
  });
});

describe('useUpdatePlayerSettings', () => {
  it('sends PUT and patches the cache', async () => {
    const fetcher: Fetcher = async (_path, options = {}) => {
      if (options.method === 'PUT') {
        return {
          ...PLAYER_SETTINGS_FIXTURE,
          theme: 'dark' as const,
          narration_verbosity: 'rich' as const,
          updated_at: '2026-09-23T00:00:00Z',
        };
      }
      return PLAYER_SETTINGS_FIXTURE;
    };
    const { result } = renderHook(
      () => ({
        query: usePlayerSettings(),
        mutation: useUpdatePlayerSettings(),
      }),
      { wrapper: makeWrapper(fetcher) },
    );
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    await act(async () => {
      await result.current.mutation.mutateAsync({ theme: 'dark' });
    });
    await waitFor(() =>
      expect(result.current.query.data?.theme).toBe('dark'),
    );
  });
});
