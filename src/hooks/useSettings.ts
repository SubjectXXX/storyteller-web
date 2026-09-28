/**
 * `useSettings` — the S2 user-defaults document (`GET/PUT /api/me/settings`).
 *
 * Scope note: this is NOT a duplicate of `usePlayerSettings`. The two hit
 * different endpoints with different allow-lists, and the canonical
 * catalogue (`src/features/settings/settingsGroups.ts`) binds each group to
 * exactly one of them via its `document` field. After the settings-topology
 * collapse this hook owns the single `document: 'legacy'` group
 * (`content_warnings`); `usePlayerSettings` owns the rest.
 *
 * Wire contract (`Settings\SettingsController`):
 *
 *   GET  /api/me/settings  →  { data: SettingsResource, meta }
 *   PUT  /api/me/settings  →  partial patch, returns the merged document
 *
 * `SettingsResource` = { theme, font_size, reduced_motion, typewriter_mode,
 * content_warnings }. No ETag / If-Match on this surface — optimistic
 * concurrency is only implemented on the player-defaults endpoint.
 *
 * `<Typewriter>` also reads `reduced_motion` from this hook.
 */
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@/api-client';
import { ApiError, type SettingsResponse, type SettingsUpdateRequest } from '@/api-client';

export const settingsKeys = {
  all: ['settings'] as const,
  me: () => [...settingsKeys.all, 'me'] as const,
};

export function useSettings(): UseQueryResult<SettingsResponse, ApiError> {
  const api = useApiClient();
  return useQuery<SettingsResponse, ApiError>({
    queryKey: settingsKeys.me(),
    queryFn: ({ signal }) => api.getSettings({ signal }),
  });
}

export function useUpdateSettings(): UseMutationResult<SettingsResponse, ApiError, SettingsUpdateRequest> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation<SettingsResponse, ApiError, SettingsUpdateRequest>({
    mutationFn: (body) => api.updateSettings(body),
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.me(), data);
    },
  });
}
