/**
 * `useBranchTree` — fetch the branch tree for the current adventure.
 *
 * API contract (S4-T03, see `fixtureFetcher` for the SPA shell):
 *
 *   GET /api/adventures/{id}/branches
 *
 * Response: `BranchTreeResponse`:
 *   {
 *     adventure_id: number;
 *     active_branch_id: number;
 *     branches: ReadonlyArray<{
 *       id: number;
 *       name: string;
 *       depth: number;
 *       parent_branch_id: number | null;
 *       parent_turn_id: number | null;
 *       is_active: boolean;
 *       can_retry: boolean;   // allowed at this branch for the current player
 *       can_undo: boolean;
 *       can_redo: boolean;
 *       turn_count: number;
 *     }>;
 *   }
 *
 * The hook also returns a tiny helper that finds a branch node by id and
 * the active branch, so the BranchBar popover can highlight the current
 * pointer and disable the right buttons.
 */
import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ApiError, type BranchTreeResponse } from '@/api-client';
import { useApiClient } from '@/api-client';

export const branchTreeKeys = {
  all: ['branches'] as const,
  detail: (adventureId: number | undefined) =>
    [...branchTreeKeys.all, 'adventure', adventureId ?? '__missing__'] as const,
};

export function useBranchTree(
  adventureId: number | undefined,
): UseQueryResult<BranchTreeResponse, ApiError> {
  const api = useApiClient();
  return useQuery<BranchTreeResponse, ApiError>({
    queryKey: branchTreeKeys.detail(adventureId),
    queryFn: ({ signal }) => {
      if (adventureId === undefined) {
        throw new ApiError(400, {
          message: 'Adventure id is required',
          code: 'missing_id',
        });
      }
      return api.getBranchTree(adventureId, { signal });
    },
    enabled: typeof adventureId === 'number',
    staleTime: 30_000,
  });
}

/**
 * Pull the active branch and a lookup helper out of a branch tree query
 * result. Components call this to render the BranchBar's disabled state.
 */
export function useBranchTreeAccessors(
  query: UseQueryResult<BranchTreeResponse, ApiError>,
): {
  readonly active: BranchTreeResponse['branches'][number] | null;
  readonly findById: (id: number) => BranchTreeResponse['branches'][number] | null;
  readonly flags: { readonly canRetry: boolean; readonly canUndo: boolean; readonly canRedo: boolean };
} {
  return useMemo(() => {
    const tree = query.data;
    const active = tree?.branches.find((b) => b.is_active) ?? null;
    const findById = (id: number) => tree?.branches.find((b) => b.id === id) ?? null;
    return {
      active,
      findById,
      flags: {
        canRetry: active?.can_retry ?? false,
        canUndo: active?.can_undo ?? false,
        canRedo: active?.can_redo ?? false,
      },
    };
  }, [query.data]);
}