/**
 * `useAdventureSettings` — fetch + update per-adventure setting overrides.
 *
 * Wire contract (S4-T05, see `fixtureFetcher` for the SPA shell):
 *
 *   GET /api/adventures/{id}/settings
 *   PUT /api/adventures/{id}/settings
 *
 * Response (`AdventureSettingsResource`):
 *   {
 *     adventure_id: number;
 *     branch_id: number;
 *     groups: ReadonlyArray<{
 *       id: string;
 *       label: string;
 *       value: string | number | boolean;             // explicit override (only when state==='override')
 *       effective_value: string | number | boolean;   // resolved value after precedence
 *       state: 'inherit' | 'override' | 'reset' | 'locked';
 *       source: 'user' | 'adventure' | 'scenario';
 *       options?: ReadonlyArray<string>;
 *       locked_reason?: string | null;
 *     }>;
 *     updated_at: string;
 *     etag: string;                                  // weak ETag for If-Match on PUT
 *   }
 *
 * Request body for PUT:
 *   {
 *     branch_id?: number | null;
 *     groups: Array<{ id: string; state: SettingGroupState; value?: string | number | boolean | null }>;
 *     if_match?: string | null;                      // ETag from the latest GET; server 409s on mismatch
 *   }
 *
 * Errors:
 *   - 422 invalid group id or value outside allowed options
 *   - 409 stale ETag (`code === 'etag_conflict'`) — the SPA re-fetches and shows a toast
 *   - 403 player lacks permission to override this group
 *
 * The hook invalidates `effectiveSettingsKeys` on success so the live
 * typography preview updates without an explicit refetch.
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
  type AdventureSettingsResource,
  type AdventureSettingsUpdateRequest,
  type EffectiveSettingsResource,
} from '@/api-client';
import { useApiClient } from '@/api-client';

export const adventureSettingsKeys = {
  all: ['adventure-settings'] as const,
  detail: (adventureId: number | undefined) =>
    [...adventureSettingsKeys.all, 'adventure', adventureId ?? '__missing__'] as const,
};

export function useAdventureSettings(
  adventureId: number | undefined,
): UseQueryResult<AdventureSettingsResource, ApiError> {
  const api = useApiClient();
  return useQuery<AdventureSettingsResource, ApiError>({
    queryKey: adventureSettingsKeys.detail(adventureId),
    queryFn: ({ signal }) => {
      if (adventureId === undefined) {
        throw new ApiError(400, {
          message: 'Adventure id is required',
          code: 'missing_id',
        });
      }
      return api.getAdventureSettings(adventureId, { signal });
    },
    enabled: typeof adventureId === 'number',
    // Cache aggressively; refetch on window focus so two tabs stay close
    // to the latest server snapshot. ETag comparison on PUT still catches
    // writes that race ahead of us between focus events.
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useUpdateAdventureSettings(
  adventureId: number,
): UseMutationResult<
  AdventureSettingsResource,
  ApiError,
  AdventureSettingsUpdateRequest
> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation<
    AdventureSettingsResource,
    ApiError,
    AdventureSettingsUpdateRequest
  >({
    mutationFn: (body) => api.updateAdventureSettings(adventureId, body),
    onSuccess: (data) => {
      queryClient.setQueryData(adventureSettingsKeys.detail(adventureId), data);
      void queryClient.invalidateQueries({ queryKey: effectiveSettingsKeys.detail(adventureId) });
    },
    // Optimistic concurrency: on 409 we mark the cached adventure-settings
    // query as stale and refetch it so the drawer surfaces the latest
    // server state instead of overwriting the other tab's changes.
    onError: (err, _vars, _ctx) => {
      if (err instanceof ApiError && err.status === 409) {
        void queryClient.invalidateQueries({
          queryKey: adventureSettingsKeys.detail(adventureId),
        });
        void queryClient.invalidateQueries({
          queryKey: effectiveSettingsKeys.detail(adventureId),
        });
      }
    },
  });
}

/**
 * Helper for callers that want to attach the latest ETag to a PUT body
 * without manually threading it through every component. The hook returns
 * the cached `etag` (or `''` when nothing is cached yet) so `mutateAsync`
 * callers can spread it into the request body.
 */
export function useAdventureSettingsEtag(adventureId: number | undefined): string {
  const queryClient = useQueryClient();
  if (adventureId === undefined) return '';
  const cached = queryClient.getQueryData<AdventureSettingsResource>(
    adventureSettingsKeys.detail(adventureId),
  );
  return cached?.etag ?? '';
}

/**
 * Resolved snapshot for the current player inside an adventure. The
 * effective-settings endpoint powers the live typography preview and the
 * "Inherited / Override / Scenario default" tooltip.
 *
 *   GET /api/me/settings/effective?adventure_id=&branch_id=
 */
export const effectiveSettingsKeys = {
  all: ['effective-settings'] as const,
  detail: (adventureId: number | undefined) =>
    [...effectiveSettingsKeys.all, 'adventure', adventureId ?? '__missing__'] as const,
};

export function useEffectiveSettings(
  adventureId: number | undefined,
  branchId: number | undefined,
): UseQueryResult<EffectiveSettingsResource, ApiError> {
  const api = useApiClient();
  return useQuery<EffectiveSettingsResource, ApiError>({
    queryKey: [
      ...effectiveSettingsKeys.detail(adventureId),
      'branch',
      branchId ?? '__missing__',
    ],
    queryFn: ({ signal }) => {
      if (adventureId === undefined) {
        throw new ApiError(400, {
          message: 'Adventure id is required',
          code: 'missing_id',
        });
      }
      return api.getEffectiveSettings(adventureId, branchId, { signal });
    },
    enabled: typeof adventureId === 'number',
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}