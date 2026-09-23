/**
 * `useNpcRoster` — fetch the non-player character roster for the active
 * branch.
 *
 * API contract (S4-T01, see `fixtureFetcher` for the SPA shell):
 *
 *   GET /api/adventures/{id}/npcs
 *
 * Response: `ReadonlyArray<NpcResource>` where each entry carries:
 *   - id, name, role, disposition, location, portrait_url, tags, alive
 *   - relationships: ReadonlyArray<{
 *       target_npc_id: number;
 *       target_name: string;
 *       kind: 'ally' | 'rival' | 'family' | 'neutral' | 'unknown';
 *       affinity: number;
 *     }>
 *
 * Errors:
 *   - 404 adventure not found
 *   - 200 with `[]` is a valid "branch has no NPCs yet" state.
 *
 * Relationships are pre-joined by the server so the SPA can render the
 * roster without a second round-trip.
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ApiError, type NpcResource } from '@/api-client';
import { useApiClient } from '@/api-client';

export const npcKeys = {
  all: ['npcs'] as const,
  detail: (adventureId: number | undefined) =>
    [...npcKeys.all, 'adventure', adventureId ?? '__missing__'] as const,
};

export function useNpcRoster(
  adventureId: number | undefined,
): UseQueryResult<ReadonlyArray<NpcResource>, ApiError> {
  const api = useApiClient();
  return useQuery<ReadonlyArray<NpcResource>, ApiError>({
    queryKey: npcKeys.detail(adventureId),
    queryFn: ({ signal }) => {
      if (adventureId === undefined) {
        throw new ApiError(400, {
          message: 'Adventure id is required',
          code: 'missing_id',
        });
      }
      return api.getNpcs(adventureId, { signal });
    },
    enabled: typeof adventureId === 'number',
    staleTime: 30_000,
  });
}