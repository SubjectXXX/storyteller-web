/**
 * `useCharacter` — fetch the current branch's character resource.
 *
 * API contract (S4-T01, wired in `fixtureFetcher` for the SPA shell):
 *
 *   GET /api/adventures/{id}/character
 *
 * Response (`CharacterResource`):
 *   {
 *     id: number;
 *     adventure_id: number;
 *     branch_id: number;
 *     name: string;
 *     role: string;
 *     portrait_url: string | null;
 *     stats: Array<{ id: string; label: string; value: number; max: number | null; icon?: string | null }>;
 *     traits: Array<{ id: string; label: string; description: string | null }>;
 *     notes: string | null;
 *   }
 *
 * Errors:
 *   - 404 adventure not found
 *   - 409 branch version conflict (refresh adventure detail and retry)
 *   - 503 scenario does not model characters (the panel renders an EmptyState)
 *
 * The hook returns a TanStack Query `UseQueryResult`. While the S4 server is
 * still in flight the SPA reads from the fixture; the contract above lets
 * the API worker match the wire format 1:1 without an SPA rewrite.
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ApiError, type CharacterResource } from '@/api-client';
import { useApiClient } from '@/api-client';

export const characterKeys = {
  all: ['character'] as const,
  detail: (adventureId: number | undefined) =>
    [...characterKeys.all, 'adventure', adventureId ?? '__missing__'] as const,
};

export function useCharacter(
  adventureId: number | undefined,
): UseQueryResult<CharacterResource, ApiError> {
  const api = useApiClient();
  return useQuery<CharacterResource, ApiError>({
    queryKey: characterKeys.detail(adventureId),
    queryFn: ({ signal }) => {
      if (adventureId === undefined) {
        throw new ApiError(400, {
          message: 'Adventure id is required',
          code: 'missing_id',
        });
      }
      return api.getCharacter(adventureId, { signal });
    },
    enabled: typeof adventureId === 'number',
    staleTime: 30_000,
  });
}