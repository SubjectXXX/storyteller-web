/**
 * `usePlayerSettings` — fetch + update the player-defaults document that
 * powers `<UserSettingsPage>` (S4-T06).
 *
 * Wire contract (S4-T06, see `fixtureFetcher` for the SPA shell):
 *
 *   GET  /api/me/settings/player-defaults
 *   PUT  /api/me/settings/player-defaults
 *
 * Response (`PlayerSettingsResource`) carries the full set of user-default
 * settings — a flat document so the API does not have to ship a separate
 * endpoint per setting group:
 *
 *   {
 *     typewriter_mode: boolean;
 *     theme: 'light' | 'dark' | 'system';
 *     content_rating: 'all-ages' | 'mature' | 'restricted';
 *     action_mode: 'guided' | 'sandbox' | 'ask';
 *     world_genre: 'romance' | 'mystery' | 'hope' | 'conflict' | 'any';
 *     language: string;
 *     narration_verbosity: 'terse' | 'balanced' | 'rich';
 *     suggested_choices_count: number;
 *     dice_visibility: 'hidden' | 'summary' | 'detailed';
 *     npc_dialogue_density: 'minimal' | 'natural' | 'verbose';
 *     updated_at: string;          // doubles as a weak ETag
 *   }
 *
 * Request body for PUT (`PlayerSettingsUpdateRequest`):
 *   - every key is optional; the API applies the patch server-side
 *   - returns the updated `PlayerSettingsResource`
 *
 * Errors:
 *   - 422 when a value is outside the allowed options for that group
 *   - 409 ETag mismatch (`code === 'etag_conflict'`) — another tab saved
 *     first; the SPA re-fetches and surfaces the conflict
 *   - 401 when the player is unauthenticated
 *
 * The mutation invalidates `effectiveSettingsKeys` so the live preview on
 * `<AdventurePage>` updates without an explicit refetch.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  ApiError,
  type PlayerSettingsResource,
  type PlayerSettingsUpdateRequest,
} from '@/api-client';
import { useApiClient } from '@/api-client';

export const playerSettingsKeys = {
  all: ['player-settings'] as const,
  detail: () => [...playerSettingsKeys.all, 'me'] as const,
};

export function usePlayerSettings(): UseQueryResult<PlayerSettingsResource, ApiError> {
  const api = useApiClient();
  return useQuery<PlayerSettingsResource, ApiError>({
    queryKey: playerSettingsKeys.detail(),
    queryFn: ({ signal }) => api.getPlayerSettings({ signal }),
    // User defaults change rarely; 30s keeps the page responsive without
    // pinging the API on every render.
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useUpdatePlayerSettings(): UseMutationResult<
  PlayerSettingsResource,
  ApiError,
  PlayerSettingsUpdateRequest
> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const etag = usePlayerSettingsEtag();
  return useMutation<PlayerSettingsResource, ApiError, PlayerSettingsUpdateRequest>({
    // Send `If-Match` so the server's optimistic-concurrency check (returns
    // 428 since v5) accepts the write. The `usePlayerSettingsEtag()` hook
    // returns the cached `updated_at` token from the most recent GET.
    mutationFn: async (body) => {
      try {
        return await api.updatePlayerSettings(body, {
          headers: etag ? { 'If-Match': etag } : undefined,
        });
      } catch (err) {
        // On 428 the cached ETag is stale; re-fetch, then retry once with
        // the fresh token. Avoids forcing the user to click "Save" again
        // when another tab has raced us to the update.
        if (err instanceof ApiError && err.status === 428) {
          await queryClient.invalidateQueries({
            queryKey: playerSettingsKeys.detail(),
          });
          const fresh = queryClient.getQueryData<PlayerSettingsResource>(
            playerSettingsKeys.detail(),
          );
          const freshEtag = fresh?.updated_at ?? '';
          return api.updatePlayerSettings(body, {
            headers: freshEtag ? { 'If-Match': freshEtag } : undefined,
          });
        }
        throw err;
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(playerSettingsKeys.detail(), data);
      // Player-default changes cascade into every open adventure, so
      // invalidate the per-adventure effective settings queries. This
      // powers the live typography preview on `<AdventurePage>`.
      void queryClient.invalidateQueries({ queryKey: ['effective-settings'] });
    },
    onError: (err) => {
      // On a 409 the cached payload is stale; force a refetch so the next
      // save attempt sees the new ETag.
      if (err instanceof ApiError && err.status === 409) {
        void queryClient.invalidateQueries({ queryKey: playerSettingsKeys.detail() });
        void queryClient.invalidateQueries({ queryKey: ['effective-settings'] });
      }
    },
  });
}

/**
 * Returns the latest player-settings `updated_at` token so callers can
 * send it as `If-Match` on optimistic-concurrency PUTs. The
 * `liveFetcher` reads the header from `RequestOptions.headers`.
 */
export function usePlayerSettingsEtag(): string {
  const queryClient = useQueryClient();
  const cached = queryClient.getQueryData<PlayerSettingsResource>(playerSettingsKeys.detail());
  return cached?.updated_at ?? '';
}
