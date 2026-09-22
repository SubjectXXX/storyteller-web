import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@/api-client';
import { ApiError, type WalletResponse, type WalletTopUpRequest, type WalletTopUpResponse } from '@/api-client';

export const walletKeys = {
  all: ['wallet'] as const,
  me: () => [...walletKeys.all, 'me'] as const,
};

export function useWallet(): UseQueryResult<WalletResponse, ApiError> {
  const api = useApiClient();
  return useQuery<WalletResponse, ApiError>({
    queryKey: walletKeys.me(),
    queryFn: ({ signal }) => api.getWallet({ signal }),
  });
}

export function useTopUpWallet(): UseMutationResult<WalletTopUpResponse, ApiError, WalletTopUpRequest> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation<WalletTopUpResponse, ApiError, WalletTopUpRequest>({
    mutationFn: (body) => api.topUpWallet(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: walletKeys.all });
    },
  });
}
