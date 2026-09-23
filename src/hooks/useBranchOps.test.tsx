import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ADVENTURE_FIXTURE,
  ApiClientProvider,
  ApiError,
  type Fetcher,
} from '@/api-client';
import { useRedoBranch, useRetryBranch, useUndoBranch } from './useBranchOps';
import { AuthProvider } from '@/auth/AuthContext';

function makeWrapper(fetcher: Fetcher, adventureId: number) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // Seed the cache with the active branch so the mutations find the branch id.
  queryClient.setQueryData(['adventures', 'detail', adventureId], ADVENTURE_FIXTURE);
  return ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ApiClientProvider fetcher={fetcher}>{children}</ApiClientProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('useRetryBranch', () => {
  it('POSTs to the retry endpoint and invalidates the branch tree', async () => {
    const called: string[] = [];
    const fetcher: Fetcher = async (path, options = {}) => {
      called.push(`${options.method ?? 'GET'} ${path}`);
      return ADVENTURE_FIXTURE.current_branch;
    };
    const adventureId = ADVENTURE_FIXTURE.id;
    const { result } = renderHook(() => useRetryBranch(adventureId), {
      wrapper: makeWrapper(fetcher, adventureId),
    });
    await act(async () => {
      await result.current.mutateAsync({ turn_id: 7, name: null });
    });
    expect(called[0]).toContain('POST');
    expect(called[0]).toContain(`/adventures/${adventureId}/branches/${ADVENTURE_FIXTURE.current_branch.id}/retry`);
  });
});

describe('useUndoBranch', () => {
  it('POSTs to the undo endpoint', async () => {
    let called = '';
    const fetcher: Fetcher = async (path, options = {}) => {
      called = `${options.method ?? 'GET'} ${path}`;
      return ADVENTURE_FIXTURE.current_branch;
    };
    const adventureId = ADVENTURE_FIXTURE.id;
    const { result } = renderHook(() => useUndoBranch(adventureId), {
      wrapper: makeWrapper(fetcher, adventureId),
    });
    await act(async () => {
      await result.current.mutateAsync({ turn_id: 7 });
    });
    expect(called).toBe(
      `POST /adventures/${adventureId}/branches/${ADVENTURE_FIXTURE.current_branch.id}/undo`,
    );
  });
});

describe('useRedoBranch', () => {
  it('POSTs to the redo endpoint and surfaces errors', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(422, { message: 'Cannot redo', code: 'branch_op_not_allowed' });
    };
    const adventureId = ADVENTURE_FIXTURE.id;
    const { result } = renderHook(() => useRedoBranch(adventureId), {
      wrapper: makeWrapper(fetcher, adventureId),
    });
    await act(async () => {
      await result.current.mutateAsync({ turn_id: null }).catch(() => undefined);
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).status).toBe(422);
  });
});
