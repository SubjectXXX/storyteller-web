import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@/api-client';
import { ApiError, type ReferralResponse, type ReferralShareRequest } from '@/api-client';

export const referralKeys = {
  all: ['referrals'] as const,
  me: () => [...referralKeys.all, 'me'] as const,
};

export function useReferral(): UseQueryResult<ReferralResponse, ApiError> {
  const api = useApiClient();
  return useQuery<ReferralResponse, ApiError>({
    queryKey: referralKeys.me(),
    queryFn: ({ signal }) => api.getReferral({ signal }),
  });
}

/**
 * POST `/api/referrals/share` to record a share event. The server returns
 * the updated referral (counter incremented), and we cache it so the UI
 * reflects the new value immediately.
 */
export function useShareReferral(): UseMutationResult<ReferralResponse, ApiError, ReferralShareRequest> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation<ReferralResponse, ApiError, ReferralShareRequest>({
    mutationFn: (body) => api.shareReferral(body),
    onSuccess: (data) => {
      queryClient.setQueryData(referralKeys.me(), data);
    },
  });
}
