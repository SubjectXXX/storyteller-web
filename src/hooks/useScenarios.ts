import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@/api-client';
import {
  ApiError,
  type PlayTurnChoiceRequest,
  type PlayTurnResponse,
  type ScenarioDetailResponse,
  type ScenarioListQuery,
  type ScenarioListResponse,
} from '@/api-client';

/**
 * Query keys are tuples that include every input the cache key depends on.
 * Keeping them centralised makes it obvious when two callers share a cache.
 */
export const scenarioKeys = {
  all: ['scenarios'] as const,
  list: (query: ScenarioListQuery | undefined) =>
    [...scenarioKeys.all, 'list', query ?? {}] as const,
  detail: (id: string) => [...scenarioKeys.all, 'detail', id] as const,
  playTurn: (id: string) => [...scenarioKeys.all, 'playTurn', id] as const,
};

export function useScenarios(query?: ScenarioListQuery): UseQueryResult<ScenarioListResponse, ApiError> {
  const api = useApiClient();
  return useQuery<ScenarioListResponse, ApiError>({
    queryKey: scenarioKeys.list(query),
    queryFn: ({ signal }) => api.listScenarios(query, { signal }),
  });
}

export function useScenario(id: string | undefined): UseQueryResult<ScenarioDetailResponse, ApiError> {
  const api = useApiClient();
  return useQuery<ScenarioDetailResponse, ApiError>({
    queryKey: scenarioKeys.detail(id ?? '__missing__'),
    queryFn: ({ signal }) => {
      if (!id) throw new ApiError(400, { message: 'Scenario id is required', code: 'missing_id' });
      return api.getScenario(id, { signal });
    },
    enabled: Boolean(id),
  });
}

export function usePlayTurn(scenarioId: string | undefined): UseQueryResult<PlayTurnResponse, ApiError> {
  const api = useApiClient();
  return useQuery<PlayTurnResponse, ApiError>({
    queryKey: scenarioKeys.playTurn(scenarioId ?? '__missing__'),
    queryFn: ({ signal }) => {
      if (!scenarioId) throw new ApiError(400, { message: 'Scenario id is required', code: 'missing_id' });
      return api.getPlayTurn(scenarioId, { signal });
    },
    enabled: Boolean(scenarioId),
  });
}

export function useSubmitChoice(scenarioId: string) {
  const api = useApiClient();
  return {
    mutationFn: (body: PlayTurnChoiceRequest) => api.submitChoice(scenarioId, body),
  };
}
