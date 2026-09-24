import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@/api-client';
import { ApiError, type CreditPackagesResponse } from '@/api-client';

/**
 * Stage 8-T01 — fetch the active credit packages from the API.
 *
 * Used by the wallet page to render the top-up cards. The catalogue
 * is public (`GET /api/credit-packages`) and small (≤ 10 rows) so we
 * cache it for a minute and skip the optimistic-update dance.
 */
export const creditPackageKeys = {
  all: ['credit-packages'] as const,
  list: () => [...creditPackageKeys.all, 'list'] as const,
};

export function useCreditPackages(): UseQueryResult<CreditPackagesResponse, ApiError> {
  const api = useApiClient();
  return useQuery<CreditPackagesResponse, ApiError>({
    queryKey: creditPackageKeys.list(),
    queryFn: ({ signal }) => api.listCreditPackages({ signal }),
    staleTime: 60_000,
  });
}
