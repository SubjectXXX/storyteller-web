import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@/api-client';
import { ApiError, type WalletResponse, type WalletTopUpRequest } from '@/api-client';

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

/**
 * Top up the wallet and optimistically reflect the credit delta on the
 * cached wallet so the UI feels instant. The mutation also invalidates the
 * wallet query so the server's authoritative balance wins on the next read.
 */
export function useTopUpWallet(): UseMutationResult<WalletResponse, ApiError, WalletTopUpRequest> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation<WalletResponse, ApiError, WalletTopUpRequest>({
    mutationFn: (body) => api.topUpWallet(body),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: walletKeys.me() });
      const previous = queryClient.getQueryData<WalletResponse>(walletKeys.me());
      if (previous) {
        queryClient.setQueryData<WalletResponse>(walletKeys.me(), {
          ...previous,
          balance: previous.balance + (body.amount ?? 0),
        });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      // Roll back the optimistic update if the server rejected the top-up.
      const snapshot = context as { previous?: WalletResponse } | undefined;
      if (snapshot?.previous) {
        queryClient.setQueryData(walletKeys.me(), snapshot.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: walletKeys.all });
    },
  });
}
