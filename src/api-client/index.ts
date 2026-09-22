/**
 * Barrel re-export for the SPA's HTTP/data layer. Pages import the
 * `useApiClient` hook from here, never directly from the fetcher module.
 */
export {
  ApiError,
  createApi,
  fixtureFetcher,
  liveFetcher,
  withFixtureFallback,
  type ApiClient,
  type Fetcher,
  type PlayTurnChoiceRequest,
  type PlayTurnResponse,
  type ReferralResponse,
  type RequestOptions,
  type ScenarioDetailResponse,
  type ScenarioListQuery,
  type ScenarioListResponse,
  type SettingsResponse,
  type SettingsUpdateRequest,
  type SettingsUpdateResponse,
  type WalletResponse,
  type WalletTopUpRequest,
  type WalletTopUpResponse,
} from './openapi';

export { ApiClientProvider, useApiClient } from './ApiClientContext';
