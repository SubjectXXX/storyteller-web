/**
 * Storyteller player SPA → API contract.
 *
 * Stage S2-T01 ships the player-facing endpoints on the Laravel API at
 * `/api/...` (Caddy strips the prefix in production). This file declares the
 * contract the SPA EXPECTS to call, mirroring the shapes used by the S1
 * fixtures in `@/fixtures/data.ts`. The endpoints that do not yet exist are
 * commented with `S2-T01` so the contract reviewer can find them in one place.
 *
 * Every export in this module is either:
 *  - a typed request/response shape,
 *  - a `Fetcher` interface the SPA uses to plug in different transports, or
 *  - a high-level `createApi(fetcher)` factory that returns typed methods.
 *
 * Fetchers:
 *  - `liveFetcher()` is what the running SPA uses: `fetch` against `/api/...`.
 *  - `fixtureFetcher()` is what the dev shell uses when the API is offline;
 *    it returns the S1 fixtures so the UI stays clickable.
 *  - Tests can pass their own `Fetcher` to exercise success/error paths.
 */
import {
  PLAY_FIXTURE,
  REFERRAL_FIXTURE,
  SCENARIO_FIXTURES,
  SETTINGS_FIXTURE,
  WALLET_FIXTURE,
  type PlayTurnFixture,
  type ReferralFixture,
  type ScenarioFixture,
  type SettingGroupFixture,
  type WalletFixture,
} from '@/fixtures/data';

// ---------- Endpoint contract -------------------------------------------------

export interface ScenarioListQuery {
  readonly rating?: 'all-ages' | 'mature' | 'restricted';
  readonly q?: string;
}

export type ScenarioListResponse = ReadonlyArray<ScenarioFixture>;

export type ScenarioDetailResponse = ScenarioFixture;

export interface PlayTurnChoiceRequest {
  readonly choiceId: string;
}

export type PlayTurnResponse = PlayTurnFixture;

export type WalletResponse = WalletFixture;

export interface WalletTopUpRequest {
  readonly packageId: string;
}

export interface WalletTopUpResponse {
  readonly reservationId: string;
  readonly checkoutUrl: string;
}

export type ReferralResponse = ReferralFixture;

export type SettingsResponse = ReadonlyArray<SettingGroupFixture>;

export interface SettingsUpdateRequest {
  readonly groups: ReadonlyArray<SettingGroupFixture>;
}

export interface SettingsUpdateResponse {
  readonly groups: ReadonlyArray<SettingGroupFixture>;
}

export interface ApiErrorBody {
  readonly message: string;
  readonly code?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(status: number, body: ApiErrorBody | string) {
    const message = typeof body === 'string' ? body : body.message;
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = typeof body === 'string' ? undefined : body.code;
  }
}

// ---------- Fetcher transport -------------------------------------------------

export interface RequestOptions {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly body?: unknown;
  readonly signal?: AbortSignal;
}

export type Fetcher = (path: string, options?: RequestOptions) => Promise<unknown>;

export interface ApiClient {
  readonly listScenarios: (query?: ScenarioListQuery, options?: RequestOptions) => Promise<ScenarioListResponse>;
  readonly getScenario: (id: string, options?: RequestOptions) => Promise<ScenarioDetailResponse>;
  readonly getPlayTurn: (scenarioId: string, options?: RequestOptions) => Promise<PlayTurnResponse>;
  readonly submitChoice: (
    scenarioId: string,
    body: PlayTurnChoiceRequest,
    options?: RequestOptions,
  ) => Promise<PlayTurnResponse>;
  readonly getWallet: (options?: RequestOptions) => Promise<WalletResponse>;
  readonly topUpWallet: (body: WalletTopUpRequest, options?: RequestOptions) => Promise<WalletTopUpResponse>;
  readonly getReferral: (options?: RequestOptions) => Promise<ReferralResponse>;
  readonly getSettings: (options?: RequestOptions) => Promise<SettingsResponse>;
  readonly updateSettings: (body: SettingsUpdateRequest, options?: RequestOptions) => Promise<SettingsUpdateResponse>;
}

// ---------- Live (HTTP) transport --------------------------------------------

const DEFAULT_BASE_URL = '/api';

export function liveFetcher(baseUrl: string = DEFAULT_BASE_URL, authToken?: string): Fetcher {
  return async (path, options = {}) => {
    const method = options.method ?? 'GET';
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (options.body !== undefined && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers,
      body: options.body !== undefined && !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : undefined,
      signal: options.signal,
      credentials: 'include',
    };
    const response = await fetch(url, init);
    const text = await response.text();
    const parsed = text.length === 0 ? undefined : safeParse(text);
    if (!response.ok) {
      const body: ApiErrorBody =
        parsed && typeof parsed === 'object' && 'message' in parsed
          ? (parsed as ApiErrorBody)
          : { message: text || response.statusText };
      throw new ApiError(response.status, body);
    }
    return parsed;
  };
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ---------- Fixture transport (offline dev / tests) --------------------------

/**
 * Returns the S1 fixtures wrapped as a `Fetcher`. The shapes match
 * `ApiClient`'s request/response types 1:1 so the same page code can run
 * against either transport. Used as the dev fallback when the API is
 * unreachable and as the test fixture.
 */
export function fixtureFetcher(): Fetcher {
  return async (path, options = {}) => {
    const method = options.method ?? 'GET';
    await delay(0);
    const path_ = stripQuery(path);

    if (method === 'GET' && path_ === '/scenarios') {
      return applyScenarioFilters(SCENARIO_FIXTURES, options.body as unknown as ScenarioListQuery | undefined);
    }
    if (method === 'GET' && /^\/scenarios\/[^/]+$/.test(path_)) {
      const id = decodeURIComponent(path_.split('/').pop() ?? '');
      const found = SCENARIO_FIXTURES.find((s) => s.id === id);
      if (!found) {
        throw new ApiError(404, { message: `Scenario ${id} not found`, code: 'scenario_not_found' });
      }
      return found;
    }
    if (method === 'GET' && /^\/scenarios\/[^/]+\/play-turn$/.test(path_)) {
      return PLAY_FIXTURE;
    }
    if (method === 'POST' && /^\/scenarios\/[^/]+\/play-turn$/.test(path_)) {
      return PLAY_FIXTURE;
    }
    if (method === 'GET' && path_ === '/wallet') {
      return WALLET_FIXTURE;
    }
    if (method === 'POST' && path_ === '/wallet/top-up') {
      const body = (options.body ?? {}) as Partial<WalletTopUpRequest>;
      return {
        reservationId: `reservation-${body.packageId ?? 'unknown'}`,
        checkoutUrl: `https://storyteller.test/checkout/${body.packageId ?? 'unknown'}`,
      } satisfies WalletTopUpResponse;
    }
    if (method === 'GET' && path_ === '/referrals/me') {
      return REFERRAL_FIXTURE;
    }
    if (method === 'GET' && path_ === '/me/settings') {
      return SETTINGS_FIXTURE;
    }
    if (method === 'PUT' && path_ === '/me/settings') {
      const body = options.body as Partial<SettingsUpdateRequest> | undefined;
      return { groups: body?.groups ?? SETTINGS_FIXTURE } satisfies SettingsUpdateResponse;
    }
    throw new ApiError(404, { message: `fixtureFetcher: no handler for ${method} ${path}`, code: 'not_found' });
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    if (ms <= 0) {
      resolve();
      return;
    }
    setTimeout(resolve, ms);
  });
}

function stripQuery(path: string): string {
  const idx = path.indexOf('?');
  return idx === -1 ? path : path.slice(0, idx);
}

function applyScenarioFilters(
  source: ReadonlyArray<ScenarioFixture>,
  query: ScenarioListQuery | undefined,
): ReadonlyArray<ScenarioFixture> {
  if (!query) return source;
  return source.filter((s) => {
    if (query.rating && s.rating !== query.rating) return false;
    if (query.q && query.q.length > 0) {
      const needle = query.q.toLowerCase();
      const haystack = `${s.title} ${s.author} ${s.synopsis}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

// ---------- Factory ----------------------------------------------------------

export function createApi(fetcher: Fetcher): ApiClient {
  return {
    listScenarios: (query, options) => {
      const params = new URLSearchParams();
      if (query?.rating) params.set('rating', query.rating);
      if (query?.q) params.set('q', query.q);
      const qs = params.toString();
      return fetcher(`/scenarios${qs ? `?${qs}` : ''}`, { ...options, method: 'GET' }) as Promise<ScenarioListResponse>;
    },
    getScenario: (id, options) =>
      fetcher(`/scenarios/${encodeURIComponent(id)}`, { ...options, method: 'GET' }) as Promise<ScenarioDetailResponse>,
    getPlayTurn: (scenarioId, options) =>
      fetcher(`/scenarios/${encodeURIComponent(scenarioId)}/play-turn`, {
        ...options,
        method: 'GET',
      }) as Promise<PlayTurnResponse>,
    submitChoice: (scenarioId, body, options) =>
      fetcher(`/scenarios/${encodeURIComponent(scenarioId)}/play-turn`, {
        ...options,
        method: 'POST',
        body,
      }) as Promise<PlayTurnResponse>,
    getWallet: (options) => fetcher('/wallet', { ...options, method: 'GET' }) as Promise<WalletResponse>,
    topUpWallet: (body, options) =>
      fetcher('/wallet/top-up', { ...options, method: 'POST', body }) as Promise<WalletTopUpResponse>,
    getReferral: (options) =>
      fetcher('/referrals/me', { ...options, method: 'GET' }) as Promise<ReferralResponse>,
    getSettings: (options) =>
      fetcher('/me/settings', { ...options, method: 'GET' }) as Promise<SettingsResponse>,
    updateSettings: (body, options) =>
      fetcher('/me/settings', { ...options, method: 'PUT', body }) as Promise<SettingsUpdateResponse>,
  };
}

// ---------- Auto-fallback wrapper --------------------------------------------

/**
 * Wraps a primary fetcher (typically the live HTTP one) with a fallback that
 * returns fixture data when the primary throws a network error. The fallback
 * is silent in production; dev surfaces a `console.warn` so the engineer
 * knows they're looking at fixtures.
 */
export function withFixtureFallback(primary: Fetcher, fallback: Fetcher = fixtureFetcher()): Fetcher {
  return async (path, options) => {
    try {
      return await primary(path, options);
    } catch (err) {
      if (isNetworkError(err)) {
        if (typeof console !== 'undefined') {
          // eslint-disable-next-line no-console -- intentional dev signal
          console.warn(`[storyteller/web] API unreachable for ${path}; using fixtures`, err);
        }
        return fallback(path, options);
      }
      throw err;
    }
  };
}

function isNetworkError(err: unknown): boolean {
  if (err instanceof ApiError) return false;
  if (err instanceof TypeError) return true;
  if (err instanceof Error) {
    return /network|failed to fetch|load failed/i.test(err.message);
  }
  return false;
}
