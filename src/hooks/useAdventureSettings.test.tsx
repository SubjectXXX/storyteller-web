import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ADVENTURE_SETTINGS_FIXTURE,
  ApiClientProvider,
  EFFECTIVE_SETTINGS_FIXTURE,
  type Fetcher,
} from '@/api-client';
import {
  useAdventureSettings,
  useEffectiveSettings,
  useUpdateAdventureSettings,
} from './useAdventureSettings';
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

describe('useAdventureSettings', () => {
  it('returns the adventure settings resource', async () => {
    const fetcher: Fetcher = async () => ADVENTURE_SETTINGS_FIXTURE;
    const { result } = renderHook(
      () => useAdventureSettings(ADVENTURE_SETTINGS_FIXTURE.adventure_id),
      { wrapper: makeWrapper(fetcher) },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.groups).toHaveLength(ADVENTURE_SETTINGS_FIXTURE.groups.length);
  });
});

describe('useEffectiveSettings', () => {
  it('returns the effective-settings resource for the active branch', async () => {
    const fetcher: Fetcher = async () => EFFECTIVE_SETTINGS_FIXTURE;
    const { result } = renderHook(
      () =>
        useEffectiveSettings(
          EFFECTIVE_SETTINGS_FIXTURE.adventure_id,
          EFFECTIVE_SETTINGS_FIXTURE.branch_id,
        ),
      { wrapper: makeWrapper(fetcher) },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.branch_id).toBe(EFFECTIVE_SETTINGS_FIXTURE.branch_id);
  });
});

describe('useUpdateAdventureSettings', () => {
  it('sends PUT and replaces the cached resource', async () => {
    let lastMethod: string | undefined;
    const fetcher: Fetcher = async (_path, options = {}) => {
      lastMethod = options.method;
      return {
        ...ADVENTURE_SETTINGS_FIXTURE,
        groups: ADVENTURE_SETTINGS_FIXTURE.groups.map((g) =>
          g.id === 'theme'
            ? { ...g, value: 'dark', effective_value: 'dark', state: 'override' as const, source: 'adventure' as const }
            : g,
        ),
        updated_at: '2026-09-23T00:00:00Z',
      };
    };
    const { result } = renderHook(
      () => ({
        query: useAdventureSettings(ADVENTURE_SETTINGS_FIXTURE.adventure_id),
        mutation: useUpdateAdventureSettings(ADVENTURE_SETTINGS_FIXTURE.adventure_id),
      }),
      { wrapper: makeWrapper(fetcher) },
    );
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    await act(async () => {
      await result.current.mutation.mutateAsync({
        groups: [
          { id: 'theme', state: 'override', value: 'dark' },
          { id: 'narration_verbosity', state: 'inherit', value: null },
        ],
      });
    });
    expect(lastMethod).toBe('PUT');
    const themeGroup = result.current.query.data?.groups.find((g) => g.id === 'theme');
    expect(themeGroup?.state).toBe('override');
  });
});
