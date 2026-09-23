/**
 * `useAiStatus` — public, read-only LLM provider status pill.
 *
 * The API exposes `GET /api/admin/ai/status` (no auth) so the home page
 * can show "Provider: LM Studio (qwen2.5-7b-instruct)" even when the
 * signed-in endpoints are offline. The hook caches the response for 30s
 * via TanStack Query so re-mounting the page during the same minute does
 * not refetch the provider check.
 *
 * Fallback behaviour: when the API is unreachable, the query stays in
 * `isError` state and `data` is `undefined`. Pages render the
 * "Provider: unknown" pill from a derived getter rather than branching
 * on the query state, so the UI stays consistent across all states.
 */
import {
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useApiClient } from '@/api-client';
import { ApiError, type AiStatusResponse } from '@/api-client';

export const aiStatusKeys = {
  all: ['ai'] as const,
  status: () => [...aiStatusKeys.all, 'status'] as const,
};

export const AI_STATUS_FALLBACK: AiStatusResponse = {
  provider: 'unknown',
  model: 'unknown',
  base_url: '',
  reachable: false,
};

export function useAiStatus(): UseQueryResult<AiStatusResponse, ApiError> {
  const api = useApiClient();
  return useQuery<AiStatusResponse, ApiError>({
    queryKey: aiStatusKeys.status(),
    queryFn: ({ signal }) => api.getAiStatus({ signal }),
    // Provider configuration rarely changes; cache for 30s so re-mounts
    // during navigation don't refetch. Players running with the API
    // offline still get a cached "unknown" pill that updates on
    // refetchOnWindowFocus.
    staleTime: 30_000,
    retry: 1,
  });
}
