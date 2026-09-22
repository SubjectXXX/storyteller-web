import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@/api-client';
import { ApiError, type ReferralResponse } from '@/api-client';

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
