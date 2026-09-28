import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useApiClient } from '@/api-client';
import {
  ApiError,
  type PlayTurnChoiceRequest,
  type PlayTurnResponse,
  type ScenarioDetailResponse,
  type ScenarioListQuery,
  type ScenarioListResponse,
  type ScenarioVersionResponse,
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
  version: (id: string, version: number) =>
    [...scenarioKeys.all, 'version', id, version] as const,
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

/**
 * `GET /api/scenarios/{slug}/versions/{version}` — the immutable ruleset
 * the adventure was started from. It is the only public source of the
 * *opening* `suggested_choices`: `GET /api/adventures/{id}` carries the
 * branch `state` but no choices, and the turn POST only answers once the
 * player has already taken a turn.
 */
export function useScenarioVersion(
  id: string | undefined,
  version: number | undefined,
): UseQueryResult<ScenarioVersionResponse, ApiError> {
  const api = useApiClient();
  return useQuery<ScenarioVersionResponse, ApiError>({
    queryKey: scenarioKeys.version(id ?? '__missing__', version ?? 0),
    queryFn: ({ signal }) => {
      if (!id || version === undefined) {
        throw new ApiError(400, { message: 'Scenario id is required', code: 'missing_id' });
      }
      return api.getScenarioVersion(id, version, { signal });
    },
    enabled: Boolean(id) && typeof version === 'number',
    staleTime: 5 * 60_000,
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
