import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useApiClient } from '@/api-client';
import {
  ApiError,
  type AdventureDetailResponse,
  type AdventureListResponse,
  type BranchResponse,
  type CreateBranchRequest,
  type StartAdventureRequest,
  type SubmitTurnRequest,
  type TurnResponse,
} from '@/api-client';

export const adventureKeys = {
  all: ['adventures'] as const,
  list: () => [...adventureKeys.all, 'list'] as const,
  detail: (id: number | undefined) => [...adventureKeys.all, 'detail', id ?? '__missing__'] as const,
};

export function useAdventures(): UseQueryResult<AdventureListResponse, ApiError> {
  const api = useApiClient();
  return useQuery<AdventureListResponse, ApiError>({
    queryKey: adventureKeys.list(),
    queryFn: ({ signal }) => api.listAdventures({ signal }),
    // Adventures are short-lived; always refetch when the window regains focus
    // so the player sees their latest `last_played_at` after closing the tab.
    refetchOnWindowFocus: true,
  });
}

export function useAdventure(
  id: number | undefined,
): UseQueryResult<AdventureDetailResponse, ApiError> {
  const api = useApiClient();
  return useQuery<AdventureDetailResponse, ApiError>({
    queryKey: adventureKeys.detail(id),
    queryFn: ({ signal }) => {
      if (id === undefined) {
        throw new ApiError(400, {
          message: 'Adventure id is required',
          code: 'missing_id',
        });
      }
      return api.getAdventure(id, { signal });
    },
    enabled: typeof id === 'number',
    refetchOnWindowFocus: true,
  });
}

export function useStartAdventure(): UseMutationResult<
  AdventureDetailResponse,
  ApiError,
  StartAdventureRequest
> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation<AdventureDetailResponse, ApiError, StartAdventureRequest>({
    mutationFn: (body) => api.startAdventure(body),
    onSuccess: (adventure) => {
      queryClient.setQueryData(adventureKeys.detail(adventure.id), adventure);
      void queryClient.invalidateQueries({ queryKey: adventureKeys.list() });
    },
  });
}

export interface SubmitTurnContext {
  previous?: AdventureDetailResponse;
}

export function useSubmitTurn(
  adventureId: number,
): UseMutationResult<TurnResponse, ApiError, SubmitTurnRequest, SubmitTurnContext> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation<TurnResponse, ApiError, SubmitTurnRequest, SubmitTurnContext>({
    mutationFn: (body) => api.submitTurn(adventureId, body),
    // Optimistic concurrency: the server may reject with a 409 version_conflict
    // when the client's `client_version` is stale. We invalidate the cache on
    // success so the next read pulls the authoritative branch state.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adventureKeys.detail(adventureId) });
    },
  });
}

export function useCreateBranch(
  adventureId: number,
): UseMutationResult<BranchResponse, ApiError, CreateBranchRequest> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation<BranchResponse, ApiError, CreateBranchRequest>({
    mutationFn: (body) => api.createBranch(adventureId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adventureKeys.detail(adventureId) });
    },
  });
}
