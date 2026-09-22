import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@/api-client';
import {
  ApiError,
  type SettingsResponse,
  type SettingsUpdateRequest,
  type SettingsUpdateResponse,
} from '@/api-client';

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

export function useUpdateSettings(): UseMutationResult<SettingsUpdateResponse, ApiError, SettingsUpdateRequest> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation<SettingsUpdateResponse, ApiError, SettingsUpdateRequest>({
    mutationFn: (body) => api.updateSettings(body),
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.me(), data.groups);
    },
  });
}
