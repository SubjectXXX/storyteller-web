/**
 * `useBranchOps` — branch navigation mutations for the Stage 4 BranchBar.
 *
 * Wire contract (S4-T03, see `fixtureFetcher` for the SPA shell):
 *
 *   POST /api/adventures/{adventureId}/branches/{branchId}/retry
 *     Body: { turn_id: number }
 *     200 -> BranchResource (the new branch the player retried into)
 *
 *   POST /api/adventures/{adventureId}/branches/{branchId}/undo
 *     Body: { turn_id?: number | null }
 *     200 -> BranchResource (the branch after undoing)
 *
 *   POST /api/adventures/{adventureId}/branches/{branchId}/redo
 *     Body: { turn_id?: number | null }
 *     200 -> BranchResource (the branch after redoing)
 *
 * Errors:
 *   - 409 branch version conflict (refresh and retry)
 *   - 422 branch does not allow retry/undo/redo
 *   - 403 player lacks permission
 *
 * On success each mutation invalidates `branchTreeKeys.all` + the adventure
 * detail query so the rest of the page sees the new active branch.
 */
import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import {
  ApiError,
  type BranchRedoRequest,
  type BranchResource,
  type BranchRetryRequest,
  type BranchUndoRequest,
} from '@/api-client';
import { useApiClient } from '@/api-client';
import { adventureKeys } from './useAdventures';
import { branchTreeKeys } from './useBranchTree';

export function useRetryBranch(
  adventureId: number,
): UseMutationResult<BranchResource, ApiError, BranchRetryRequest> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation<BranchResource, ApiError, BranchRetryRequest>({
    mutationFn: (body) => {
      const branch = queryClient.getQueryData<{ current_branch: { id: number } }>(
        adventureKeys.detail(adventureId),
      )?.current_branch.id;
      return api.retryBranch(adventureId, branch ?? 0, body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adventureKeys.detail(adventureId) });
      void queryClient.invalidateQueries({ queryKey: branchTreeKeys.detail(adventureId) });
    },
  });
}

export function useUndoBranch(
  adventureId: number,
): UseMutationResult<BranchResource, ApiError, BranchUndoRequest> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation<BranchResource, ApiError, BranchUndoRequest>({
    mutationFn: (body) => {
      const branch = queryClient.getQueryData<{ current_branch: { id: number } }>(
        adventureKeys.detail(adventureId),
      )?.current_branch.id;
      return api.undoBranch(adventureId, branch ?? 0, body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adventureKeys.detail(adventureId) });
      void queryClient.invalidateQueries({ queryKey: branchTreeKeys.detail(adventureId) });
    },
  });
}

export function useRedoBranch(
  adventureId: number,
): UseMutationResult<BranchResource, ApiError, BranchRedoRequest> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation<BranchResource, ApiError, BranchRedoRequest>({
    mutationFn: (body) => {
      const branch = queryClient.getQueryData<{ current_branch: { id: number } }>(
        adventureKeys.detail(adventureId),
      )?.current_branch.id;
      return api.redoBranch(adventureId, branch ?? 0, body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adventureKeys.detail(adventureId) });
      void queryClient.invalidateQueries({ queryKey: branchTreeKeys.detail(adventureId) });
    },
  });
}