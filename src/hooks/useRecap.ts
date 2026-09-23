/**
 * `useRecap` — fetch the recap resource for the active branch.
 *
 * Wire contract (S5-T03 / S4-T05 placeholder, see `fixtureFetcher` for the
 * SPA shell):
 *
 *   GET /api/adventures/{id}/recap
 *
 * Response (`RecapResource`):
 *   {
 *     adventure_id: number;
 *     branch_id: number;
 *     generated_at: string;
 *     turns: ReadonlyArray<{
 *       turn_id: number;
 *       sequence_number: number;
 *       headline: string;
 *       happened_at: string;
 *     }>;
 *   }
 *
 * Errors:
 *   - 404 the API hasn't shipped the endpoint yet — `<MemoryPanel>` renders
 *     a "Coming in Stage 5" placeholder when the hook reports an error.
 *   - 200 with `turns: []` — empty recap (treated as no recap).
 *
 * The hook never disables itself when the error is a 404: callers can decide
 * whether to surface it or fall back to the empty state.
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  ApiError,
  type RecapResource,
} from '@/api-client';
import { useApiClient } from '@/api-client';

export const recapKeys = {
  all: ['recap'] as const,
  detail: (adventureId: number | undefined) =>
    [...recapKeys.all, 'adventure', adventureId ?? '__missing__'] as const,
};

export function useRecap(
  adventureId: number | undefined,
): UseQueryResult<RecapResource, ApiError> {
  const api = useApiClient();
  return useQuery<RecapResource, ApiError>({
    queryKey: recapKeys.detail(adventureId),
    queryFn: ({ signal }) => {
      if (adventureId === undefined) {
        throw new ApiError(400, {
          message: 'Adventure id is required',
          code: 'missing_id',
        });
      }
      return api.getRecap(adventureId, { signal });
    },
    enabled: typeof adventureId === 'number',
    // Recaps are expensive; cache for 5 minutes so navigating away and
    // back doesn't refetch.
    staleTime: 5 * 60_000,
  });
}
