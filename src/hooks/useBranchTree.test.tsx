import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ApiClientProvider,
  ApiError,
  BRANCH_TREE_FIXTURE,
  type Fetcher,
} from '@/api-client';
import { useBranchTree, useBranchTreeAccessors } from './useBranchTree';
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

describe('useBranchTree', () => {
  it('returns the branch tree on success', async () => {
    const fetcher: Fetcher = async () => BRANCH_TREE_FIXTURE;
    const { result } = renderHook(() => useBranchTree(BRANCH_TREE_FIXTURE.adventure_id), {
      wrapper: makeWrapper(fetcher),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.branches).toHaveLength(BRANCH_TREE_FIXTURE.branches.length);
    expect(result.current.data?.active_branch_id).toBe(BRANCH_TREE_FIXTURE.active_branch_id);
  });

  it('does not run when the adventure id is missing', () => {
    const fetcher: Fetcher = async () => {
      throw new Error('should not be called');
    };
    const { result } = renderHook(() => useBranchTree(undefined), {
      wrapper: makeWrapper(fetcher),
    });
    expect(result.current.isFetching).toBe(false);
  });

  it('surfaces API errors', async () => {
    const fetcher: Fetcher = async () => {
      throw new ApiError(422, { message: 'No branches yet', code: 'no_branches' });
    };
    const { result } = renderHook(() => useBranchTree(1), {
      wrapper: makeWrapper(fetcher),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).code).toBe('no_branches');
  });
});

describe('useBranchTreeAccessors', () => {
  it('finds the active branch and exposes per-branch flags', async () => {
    const fetcher: Fetcher = async () => BRANCH_TREE_FIXTURE;
    const { result } = renderHook(
      () => {
        const query = useBranchTree(BRANCH_TREE_FIXTURE.adventure_id);
        const accessors = useBranchTreeAccessors(query);
        return { query, accessors };
      },
      { wrapper: makeWrapper(fetcher) },
    );
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    expect(result.current.accessors.active?.id).toBe(BRANCH_TREE_FIXTURE.active_branch_id);
    expect(result.current.accessors.flags.canRetry).toBe(true);
    expect(result.current.accessors.flags.canUndo).toBe(true);
    expect(result.current.accessors.flags.canRedo).toBe(false);
    expect(result.current.accessors.findById(99)).toBeNull();
  });
});
