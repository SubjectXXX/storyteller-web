import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useApiClient } from '@/api-client';
import { ApiError, type AiTestRequest, type AiTestResponse } from '@/api-client';
import { walletKeys } from '@/hooks/useWallet';

/**
 * Stage 8-T02 — wallet "Test LLM" probe.
 *
 * Sends a fixed prompt to `POST /api/me/ai/test`, which charges credits
 * via the S8-T01 TransactionService and returns the LLM response +
 * balance delta. We invalidate the wallet query so the authoritative
 * balance wins on the next read (the server rounds micro-credit cost
 * up to the nearest whole credit with a 1-credit floor).
 */
export function useTestAi(): UseMutationResult<AiTestResponse, ApiError, AiTestRequest> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation<AiTestResponse, ApiError, AiTestRequest>({
    mutationFn: (body) => api.testAi(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: walletKeys.all });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: walletKeys.all });
    },
  });
}
