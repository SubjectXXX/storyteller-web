import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ApiClientProvider,
  ApiError,
  LORE_FIXTURE,
  RECAP_FIXTURE,
  type Fetcher,
} from '@/api-client';
import { AuthProvider } from '@/auth/AuthContext';
import {
  memoryKeys,
  useMemoryLore,
  useMemoryPinned,
  useMemoryRecap,
} from './useMemory';

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

describe('useMemoryRecap', () => {
  it('returns the recap resource on success', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === `/adventures/${RECAP_FIXTURE.adventure_id}/recap`) {
        return RECAP_FIXTURE;
      }
      throw new ApiError(404, { message: 'not found', code: 'not_found' });
    };
    const { result } = renderHook(() => useMemoryRecap(RECAP_FIXTURE.adventure_id), {
      wrapper: makeWrapper(fetcher),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.turns).toHaveLength(RECAP_FIXTURE.turns.length);
    expect(result.current.data?.turns[0]?.headline).toBe(RECAP_FIXTURE.turns[0]?.headline);
  });

  it('does not run when the adventure id is missing', () => {
    const fetcher: Fetcher = async () => {
      throw new Error('should not be called');
    };
    const { result } = renderHook(() => useMemoryRecap(undefined), {
      wrapper: makeWrapper(fetcher),
    });
    expect(result.current.isFetching).toBe(false);
  });

  it('surfaces a 404 — not-available path', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(404, {
        message: 'not available yet',
        code: 'not_implemented',
      });
    };
    const { result } = renderHook(() => useMemoryRecap(7), {
      wrapper: makeWrapper(fetcher),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).status).toBe(404);
  });
});

describe('useMemoryLore', () => {
  it('returns the full lore list when no key is supplied', async () => {
    const fetcher: Fetcher = async (path) => {
      if (path === `/adventures/${LORE_FIXTURE.adventure_id}/lore`) {
        return LORE_FIXTURE;
      }
      throw new ApiError(404, { message: 'not found', code: 'not_found' });
    };
    const { result } = renderHook(() => useMemoryLore(LORE_FIXTURE.adventure_id), {
      wrapper: makeWrapper(fetcher),
    });
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    expect(result.current.query.data?.entries).toHaveLength(LORE_FIXTURE.entries.length);
    expect(result.current.entry).toBeUndefined();
  });

  it('surfaces the matching entry on the result object when a key is supplied', async () => {
    const focused = LORE_FIXTURE.entries[1]!;
    const fetcher: Fetcher = async (path) => {
      if (path === `/adventures/${LORE_FIXTURE.adventure_id}/lore?key=${focused.key}`) {
        return { adventure_id: LORE_FIXTURE.adventure_id, entries: [focused] };
      }
      throw new ApiError(404, { message: 'not found', code: 'not_found' });
    };
    const { result } = renderHook(
      () => useMemoryLore(LORE_FIXTURE.adventure_id, focused.key),
      { wrapper: makeWrapper(fetcher) },
    );
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    expect(result.current.entry?.key).toBe(focused.key);
  });

  it('does not run when the adventure id is missing', () => {
    const fetcher: Fetcher = async () => {
      throw new Error('should not be called');
    };
    const { result } = renderHook(() => useMemoryLore(undefined, 'archive.location'), {
      wrapper: makeWrapper(fetcher),
    });
    expect(result.current.query.isFetching).toBe(false);
  });
});

describe('useMemoryPinned', () => {
  // The API has no `adventures/{id}/pinned-memories` route, so the hook must
  // report the gap instead of firing a request that can only 404 (and then
  // be mistaken for "the player has not starred anything").
  it('never issues a request for the missing pinned-memories route', async () => {
    const calls: string[] = [];
    const fetcher: Fetcher = async (path) => {
      calls.push(path);
      throw new ApiError(404, { message: 'not found', code: 'not_found' });
    };
    const { result } = renderHook(() => useMemoryPinned(101), {
      wrapper: makeWrapper(fetcher),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(calls).toEqual([]);
  });

  it('surfaces endpoint_not_implemented — not an empty pinned list', async () => {
    const fetcher: Fetcher = async () => {
      throw new Error('should not be called');
    };
    const { result } = renderHook(() => useMemoryPinned(101), {
      wrapper: makeWrapper(fetcher),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    const error = result.current.error as ApiError;
    expect(error.status).toBe(501);
    expect(error.code).toBe('endpoint_not_implemented');
    expect(result.current.data).toBeUndefined();
    expect(error.message).toMatch(/not available/i);
  });

  it('does not run when the adventure id is missing', () => {
    const fetcher: Fetcher = async () => {
      throw new Error('should not be called');
    };
    const { result } = renderHook(() => useMemoryPinned(undefined), {
      wrapper: makeWrapper(fetcher),
    });
    expect(result.current.isFetching).toBe(false);
    expect(result.current.isError).toBe(false);
  });
});

describe('memoryKeys', () => {
  it('exposes stable query keys so callers can invalidate manually', () => {
    expect(memoryKeys.all).toEqual(['memory']);
    expect(memoryKeys.recap(42)).toEqual(['memory', 'recap', 42]);
    expect(memoryKeys.recap(undefined)).toEqual(['memory', 'recap', '__missing__']);
    expect(memoryKeys.lore(42)).toEqual(['memory', 'lore', 42]);
    expect(memoryKeys.loreEntry(42, 'archive.location')).toEqual([
      'memory',
      'lore',
      42,
      'entry',
      'archive.location',
    ]);
    expect(memoryKeys.pinned(42)).toEqual(['memory', 'pinned', 42]);
  });
});