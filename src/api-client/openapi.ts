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
 *  - `liveFetcher()` is what the running SPA uses: `fetch` against `/api/...`,
 *    transparently unwrapping the `{data, meta}` envelope that every S2
 *    endpoint returns (see `docs/api/envelope.md`).
 *  - `fixtureFetcher()` is what the dev shell uses when the API is offline;
 *    it returns the S1/S2 fixtures so the UI stays clickable.
 *  - Tests can pass their own `Fetcher` to exercise success/error paths.
 */
import {
  ADVENTURE_FIXTURE,
  ADVENTURE_LIST_FIXTURE,
  AUTH_FIXTURE,
  PLAY_FIXTURE,
  REFERRAL_RESOURCE_FIXTURE,
  SCENARIO_RESOURCE_FIXTURES,
  SCENARIO_VERSION_FIXTURE,
  SETTINGS_RESOURCE_FIXTURE,
  TURN_FIXTURE,
  WALLET_RESOURCE_FIXTURE,
  type AdventureResource,
  type AdventureStatus,
  type AuthTokenResource,
  type BranchResource,
  type PlayTurnFixture,
  type ReferralResource,
  type ScenarioFixture,
  type ScenarioResource,
  type ScenarioVersionResource,
  type SettingsResource,
  type SettingGroupFixture,
  type SuggestedChoice,
  type TurnResource,
  type UserResource,
  type WalletResource,
} from '@/fixtures/data';

// ---------- Endpoint contract -------------------------------------------------

// ---------- Auth -----------------------------------------------------------

export interface SignInRequest {
  readonly email: string;
  readonly password: string;
  readonly device_name?: string;
}

export interface SignUpRequest {
  readonly email: string;
  readonly password: string;
  readonly password_confirmation: string;
  readonly name: string;
  readonly attests_adult: boolean;
  readonly locale?: string;
}

export type AuthResponse = AuthTokenResource;
export type UserResponse = UserResource;

// ---------- Scenarios ------------------------------------------------------

export interface ScenarioListQuery {
  readonly rating?: 'all-ages' | 'mature' | 'restricted';
  readonly q?: string;
}

export type ScenarioListResponse = ReadonlyArray<ScenarioResource>;
export type ScenarioDetailResponse = ScenarioResource;
export type ScenarioVersionResponse = ScenarioVersionResource;

// ---------- Adventures -----------------------------------------------------

export interface StartAdventureRequest {
  readonly scenario_slug: string;
  readonly scenario_version?: number;
}

export type AdventureListResponse = ReadonlyArray<AdventureResource>;
export type AdventureDetailResponse = AdventureResource;

export interface SubmitTurnRequest {
  readonly branch_id: number;
  readonly choice_id?: string | null;
  readonly free_text?: string | null;
  readonly idempotency_key: string;
  readonly client_version: number;
}

export type TurnResponse = TurnResource;

export interface CreateBranchRequest {
  readonly from_branch_id: number;
  readonly from_turn_id: number;
  readonly name?: string | null;
}

export type BranchResponse = BranchResource;

// ---------- Wallet / referrals / settings -----------------------------------

export type WalletResponse = WalletResource;

export interface WalletTopUpRequest {
  readonly amount: number;
  readonly package_id?: string | null;
}

export type ReferralResponse = ReferralResource;

export interface ReferralShareRequest {
  readonly channel: 'email' | 'sms' | 'link' | 'other';
}

export type SettingsResponse = SettingsResource;

export interface SettingsUpdateRequest {
  readonly theme?: SettingsResource['theme'];
  readonly font_size?: SettingsResource['font_size'];
  readonly reduced_motion?: boolean;
  readonly typewriter_mode?: boolean;
  readonly content_warnings?: ReadonlyArray<string>;
}

// ---------- Legacy play-turn shape (used by PlaySurfacePlaceholder) -------

export type ScenarioListLegacyResponse = ReadonlyArray<ScenarioFixture>;
export type ScenarioDetailLegacyResponse = ScenarioFixture;
export type PlayTurnLegacyResponse = PlayTurnFixture;

export interface PlayTurnChoiceRequest {
  readonly choiceId: string;
}

export type PlayTurnResponse = PlayTurnFixture;
export type SettingsLegacyResponse = ReadonlyArray<SettingGroupFixture>;
export interface SettingsLegacyUpdateRequest {
  readonly groups: ReadonlyArray<SettingGroupFixture>;
}
export type SettingsLegacyUpdateResponse = { readonly groups: ReadonlyArray<SettingGroupFixture> };

export interface WalletLegacyTopUpResponse {
  readonly reservationId: string;
  readonly checkoutUrl: string;
}

// ---------- Errors ---------------------------------------------------------

export interface ApiErrorBody {
  readonly message: string;
  readonly code?: string;
  readonly fields?: Readonly<Record<string, string>>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fields?: Readonly<Record<string, string>>;
  constructor(status: number, body: ApiErrorBody | string) {
    const message = typeof body === 'string' ? body : body.message;
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = typeof body === 'string' ? undefined : body.code;
    this.fields = typeof body === 'string' ? undefined : body.fields;
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
  // Auth
  readonly signIn: (body: SignInRequest, options?: RequestOptions) => Promise<AuthResponse>;
  readonly signUp: (body: SignUpRequest, options?: RequestOptions) => Promise<AuthResponse>;
  readonly signOut: (options?: RequestOptions) => Promise<void>;
  readonly me: (options?: RequestOptions) => Promise<UserResponse>;

  // Scenarios
  readonly listScenarios: (
    query?: ScenarioListQuery,
    options?: RequestOptions,
  ) => Promise<ScenarioListResponse>;
  readonly getScenario: (slug: string, options?: RequestOptions) => Promise<ScenarioDetailResponse>;
  readonly getScenarioVersion: (
    slug: string,
    version: number,
    options?: RequestOptions,
  ) => Promise<ScenarioVersionResponse>;

  // Adventures
  readonly listAdventures: (options?: RequestOptions) => Promise<AdventureListResponse>;
  readonly startAdventure: (
    body: StartAdventureRequest,
    options?: RequestOptions,
  ) => Promise<AdventureDetailResponse>;
  readonly getAdventure: (id: number, options?: RequestOptions) => Promise<AdventureDetailResponse>;
  readonly submitTurn: (
    adventureId: number,
    body: SubmitTurnRequest,
    options?: RequestOptions,
  ) => Promise<TurnResponse>;
  readonly createBranch: (
    adventureId: number,
    body: CreateBranchRequest,
    options?: RequestOptions,
  ) => Promise<BranchResponse>;

  // Wallet
  readonly getWallet: (options?: RequestOptions) => Promise<WalletResponse>;
  readonly topUpWallet: (
    body: WalletTopUpRequest,
    options?: RequestOptions,
  ) => Promise<WalletResponse>;

  // Referrals
  readonly getReferral: (options?: RequestOptions) => Promise<ReferralResponse>;
  readonly shareReferral: (
    body: ReferralShareRequest,
    options?: RequestOptions,
  ) => Promise<ReferralResponse>;

  // Settings
  readonly getSettings: (options?: RequestOptions) => Promise<SettingsResponse>;
  readonly updateSettings: (
    body: SettingsUpdateRequest,
    options?: RequestOptions,
  ) => Promise<SettingsResponse>;

  // Legacy play-turn surface (used by PlaySurfacePlaceholder until S2 wires
  // /api/adventures/:id for actual play). Keep these so the placeholder
  // continues to render offline.
  readonly getPlayTurn: (scenarioId: string, options?: RequestOptions) => Promise<PlayTurnLegacyResponse>;
  readonly submitChoice: (
    scenarioId: string,
    body: PlayTurnChoiceRequest,
    options?: RequestOptions,
  ) => Promise<PlayTurnLegacyResponse>;
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

    if (response.status === 204) {
      return undefined;
    }

    if (!response.ok) {
      const errBody = extractErrorBody(parsed, text, response.statusText);
      throw new ApiError(response.status, errBody);
    }

    // S2 envelope: every endpoint returns {data, meta} (or {data: null, errors,
    // meta} on errors). The SPA works in terms of the unwrapped payload, so
    // strip the envelope here. If the response is not wrapped (e.g. legacy
    // endpoint without an envelope), return it as-is.
    return unwrapEnvelope(parsed);
  };
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function unwrapEnvelope(parsed: unknown): unknown {
  if (parsed && typeof parsed === 'object' && 'data' in parsed) {
    const envelope = parsed as { data: unknown; meta?: unknown };
    return envelope.data;
  }
  return parsed;
}

function extractErrorBody(
  parsed: unknown,
  text: string,
  fallback: string,
): ApiErrorBody {
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    const errors = Array.isArray(obj.errors) ? (obj.errors as ReadonlyArray<Record<string, unknown>>) : [];
    const first = errors[0];
    if (first) {
      const code = typeof first.code === 'string' ? first.code : undefined;
      const message = typeof first.message === 'string' ? first.message : text || fallback;
      const fields =
        first.fields && typeof first.fields === 'object' && !Array.isArray(first.fields)
          ? (Object.fromEntries(
              Object.entries(first.fields as Record<string, unknown>).filter(
                (entry): entry is [string, string] => typeof entry[1] === 'string',
              ),
            ) as Record<string, string>)
          : undefined;
      return fields ? { message, code, fields } : { message, ...(code !== undefined ? { code } : {}) };
    }
    if (typeof obj.message === 'string') {
      const code = typeof obj.code === 'string' ? obj.code : undefined;
      const fields =
        obj.fields && typeof obj.fields === 'object' && !Array.isArray(obj.fields)
          ? (Object.fromEntries(
              Object.entries(obj.fields as Record<string, unknown>).filter(
                (entry): entry is [string, string] => typeof entry[1] === 'string',
              ),
            ) as Record<string, string>)
          : undefined;
      if (fields) {
        return code !== undefined ? { message: obj.message, code, fields } : { message: obj.message, fields };
      }
      return code !== undefined ? { message: obj.message, code } : { message: obj.message };
    }
  }
  return { message: text || fallback };
}

// ---------- Fixture transport (offline dev / tests) --------------------------

/**
 * Returns the S1+S2 fixtures wrapped as a `Fetcher`. The shapes match
 * `ApiClient`'s request/response types 1:1 so the same page code can run
 * against either transport. Used as the dev fallback when the API is
 * unreachable and as the test fixture.
 */
export function fixtureFetcher(): Fetcher {
  return async (path, options = {}) => {
    const method = options.method ?? 'GET';
    await delay(0);
    const path_ = stripQuery(path);

    // ----- Auth -----
    if (method === 'POST' && path_ === '/auth/login') {
      const body = (options.body ?? {}) as Partial<SignInRequest>;
      if (!body.email || !body.password) {
        throw new ApiError(422, {
          message: 'Email and password are required.',
          code: 'validation',
          fields: {
            ...(body.email ? {} : { email: 'Email is required.' }),
            ...(body.password ? {} : { password: 'Password is required.' }),
          },
        });
      }
      return AUTH_FIXTURE satisfies AuthResponse;
    }
    if (method === 'POST' && path_ === '/auth/register') {
      const body = (options.body ?? {}) as Partial<SignUpRequest>;
      if (!body.email || !body.password || !body.name || body.attests_adult !== true) {
        throw new ApiError(422, {
          message: 'Registration fields are invalid.',
          code: 'validation',
          fields: {
            ...(body.email ? {} : { email: 'Email is required.' }),
            ...(body.password ? {} : { password: 'Password is required.' }),
            ...(body.name ? {} : { name: 'Name is required.' }),
            ...(body.attests_adult === true ? {} : { attests_adult: 'You must attest you are an adult.' }),
          },
        });
      }
      return AUTH_FIXTURE satisfies AuthResponse;
    }
    if (method === 'POST' && path_ === '/auth/logout') {
      return undefined;
    }
    if (method === 'GET' && path_ === '/auth/me') {
      return AUTH_FIXTURE.user satisfies UserResponse;
    }

    // ----- Scenarios (new envelope-style shape) -----
    if (method === 'GET' && path_ === '/scenarios') {
      return applyScenarioFilters(
        SCENARIO_RESOURCE_FIXTURES,
        options.body as unknown as ScenarioListQuery | undefined,
      );
    }
    if (method === 'GET' && /^\/scenarios\/[^/]+$/.test(path_)) {
      const slug = decodeURIComponent(path_.split('/').pop() ?? '');
      const found = SCENARIO_RESOURCE_FIXTURES.find((s) => s.slug === slug);
      if (!found) {
        throw new ApiError(404, { message: `Scenario ${slug} not found`, code: 'not_found' });
      }
      return found satisfies ScenarioResource;
    }
    if (method === 'GET' && /^\/scenarios\/[^/]+\/versions\/\d+$/.test(path_)) {
      const segs = path_.split('/');
      const version = Number(segs[segs.length - 1]);
      return { ...SCENARIO_VERSION_FIXTURE, version } satisfies ScenarioVersionResource;
    }

    // ----- Adventures -----
    if (method === 'GET' && path_ === '/adventures') {
      return ADVENTURE_LIST_FIXTURE satisfies AdventureListResponse;
    }
    if (method === 'POST' && path_ === '/adventures') {
      const body = (options.body ?? {}) as Partial<StartAdventureRequest>;
      if (!body.scenario_slug) {
        throw new ApiError(422, {
          message: 'scenario_slug is required.',
          code: 'validation',
          fields: { scenario_slug: 'scenario_slug is required.' },
        });
      }
      const scenario = SCENARIO_RESOURCE_FIXTURES.find((s) => s.slug === body.scenario_slug);
      if (!scenario) {
        throw new ApiError(404, {
          message: `Scenario ${body.scenario_slug} not found`,
          code: 'not_found',
        });
      }
      return {
        ...ADVENTURE_FIXTURE,
        scenario_id: scenario.id,
        scenario_slug: scenario.slug,
        scenario_version: body.scenario_version ?? scenario.latest_version,
        title: scenario.title,
      } satisfies AdventureResource;
    }
    if (method === 'GET' && /^\/adventures\/\d+$/.test(path_)) {
      const id = Number(path_.split('/').pop() ?? '0');
      if (id !== ADVENTURE_FIXTURE.id) {
        throw new ApiError(404, { message: `Adventure ${id} not found`, code: 'not_found' });
      }
      return ADVENTURE_FIXTURE satisfies AdventureResource;
    }
    if (method === 'POST' && /^\/adventures\/\d+\/turns$/.test(path_)) {
      const body = (options.body ?? {}) as Partial<SubmitTurnRequest>;
      if (!body.idempotency_key) {
        throw new ApiError(422, {
          message: 'idempotency_key is required.',
          code: 'validation',
          fields: { idempotency_key: 'idempotency_key is required.' },
        });
      }
      if (!body.branch_id || body.client_version === undefined) {
        throw new ApiError(422, {
          message: 'branch_id and client_version are required.',
          code: 'validation',
          fields: {
            ...(body.branch_id ? {} : { branch_id: 'branch_id is required.' }),
            ...(body.client_version !== undefined ? {} : { client_version: 'client_version is required.' }),
          },
        });
      }
      // Simulate a version conflict if the client_version is behind.
      const scenario = SCENARIO_RESOURCE_FIXTURES.find((s) => s.slug === ADVENTURE_FIXTURE.scenario_slug);
      const validScenarioVersion = scenario?.latest_version ?? 1;
      if (body.client_version < validScenarioVersion) {
        throw new ApiError(409, {
          message: 'Branch version is stale; refresh and retry.',
          code: 'version_conflict',
        });
      }
      return {
        ...TURN_FIXTURE,
        branch_id: body.branch_id,
        choice_id: body.choice_id ?? null,
        free_text: body.free_text ?? null,
        idempotency_key: body.idempotency_key,
      } satisfies TurnResource;
    }
    if (method === 'POST' && /^\/adventures\/\d+\/branches$/.test(path_)) {
      const body = (options.body ?? {}) as Partial<CreateBranchRequest>;
      if (!body.from_branch_id || !body.from_turn_id) {
        throw new ApiError(422, {
          message: 'from_branch_id and from_turn_id are required.',
          code: 'validation',
        });
      }
      const branch: BranchResource = {
        id: ADVENTURE_FIXTURE.current_branch.id + 1,
        name: body.name ?? `fork-${body.from_branch_id}`,
        depth: ADVENTURE_FIXTURE.current_branch.depth + 1,
        version: 1,
        parent_branch_id: body.from_branch_id,
        parent_turn_id: body.from_turn_id,
        state: ADVENTURE_FIXTURE.current_branch.state,
      };
      return branch satisfies BranchResource;
    }

    // ----- Wallet -----
    if (method === 'GET' && path_ === '/wallet') {
      return WALLET_RESOURCE_FIXTURE satisfies WalletResponse;
    }
    if (method === 'POST' && path_ === '/wallet/top-up') {
      const body = (options.body ?? {}) as Partial<WalletTopUpRequest>;
      const amount = body.amount ?? 0;
      return {
        ...WALLET_RESOURCE_FIXTURE,
        balance: WALLET_RESOURCE_FIXTURE.balance + amount,
        updated_at: new Date().toISOString(),
      } satisfies WalletResponse;
    }

    // ----- Referrals -----
    if (method === 'GET' && path_ === '/referrals/me') {
      return REFERRAL_RESOURCE_FIXTURE satisfies ReferralResponse;
    }
    if (method === 'POST' && path_ === '/referrals/share') {
      return {
        ...REFERRAL_RESOURCE_FIXTURE,
        count: REFERRAL_RESOURCE_FIXTURE.count + 1,
        updated_at: new Date().toISOString(),
      } satisfies ReferralResource;
    }

    // ----- Settings -----
    if (method === 'GET' && path_ === '/me/settings') {
      return SETTINGS_RESOURCE_FIXTURE satisfies SettingsResponse;
    }
    if (method === 'PUT' && path_ === '/me/settings') {
      const body = (options.body ?? {}) as SettingsUpdateRequest;
      return {
        ...SETTINGS_RESOURCE_FIXTURE,
        ...body,
        updated_at: new Date().toISOString(),
      } satisfies SettingsResponse;
    }

    // ----- Legacy play-turn (kept for PlaySurfacePlaceholder) -----
    if (method === 'GET' && /^\/scenarios\/[^/]+\/play-turn$/.test(path_)) {
      return PLAY_FIXTURE satisfies PlayTurnFixture;
    }
    if (method === 'POST' && /^\/scenarios\/[^/]+\/play-turn$/.test(path_)) {
      return PLAY_FIXTURE satisfies PlayTurnFixture;
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
  source: ReadonlyArray<ScenarioResource>,
  query: ScenarioListQuery | undefined,
): ReadonlyArray<ScenarioResource> {
  if (!query) return source;
  return source.filter((s) => {
    if (query.rating) {
      // Map rating to tag heuristics. Real API does this server-side; the
      // fixture applies the same heuristic so dev parity holds.
      if (query.rating === 'all-ages' && s.tags.includes('mature')) return false;
      if (query.rating === 'mature' && !s.tags.includes('mature') && !s.tags.includes('conflict')) return false;
    }
    if (query.q && query.q.length > 0) {
      const needle = query.q.toLowerCase();
      const haystack = `${s.title} ${s.blurb} ${s.tags.join(' ')}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

// ---------- Factory ----------------------------------------------------------

export function createApi(fetcher: Fetcher): ApiClient {
  return {
    // Auth
    signIn: (body, options) =>
      fetcher('/auth/login', { ...options, method: 'POST', body }) as Promise<AuthResponse>,
    signUp: (body, options) =>
      fetcher('/auth/register', { ...options, method: 'POST', body }) as Promise<AuthResponse>,
    signOut: (options) =>
      fetcher('/auth/logout', { ...options, method: 'POST' }) as Promise<void>,
    me: (options) =>
      fetcher('/auth/me', { ...options, method: 'GET' }) as Promise<UserResponse>,

    // Scenarios
    listScenarios: (query, options) => {
      const params = new URLSearchParams();
      if (query?.rating) params.set('rating', query.rating);
      if (query?.q) params.set('q', query.q);
      const qs = params.toString();
      return fetcher(`/scenarios${qs ? `?${qs}` : ''}`, { ...options, method: 'GET' }) as Promise<ScenarioListResponse>;
    },
    getScenario: (slug, options) =>
      fetcher(`/scenarios/${encodeURIComponent(slug)}`, { ...options, method: 'GET' }) as Promise<ScenarioDetailResponse>,
    getScenarioVersion: (slug, version, options) =>
      fetcher(`/scenarios/${encodeURIComponent(slug)}/versions/${version}`, {
        ...options,
        method: 'GET',
      }) as Promise<ScenarioVersionResponse>,

    // Adventures
    listAdventures: (options) =>
      fetcher('/adventures', { ...options, method: 'GET' }) as Promise<AdventureListResponse>,
    startAdventure: (body, options) =>
      fetcher('/adventures', { ...options, method: 'POST', body }) as Promise<AdventureDetailResponse>,
    getAdventure: (id, options) =>
      fetcher(`/adventures/${id}`, { ...options, method: 'GET' }) as Promise<AdventureDetailResponse>,
    submitTurn: (adventureId, body, options) =>
      fetcher(`/adventures/${adventureId}/turns`, {
        ...options,
        method: 'POST',
        body,
      }) as Promise<TurnResponse>,
    createBranch: (adventureId, body, options) =>
      fetcher(`/adventures/${adventureId}/branches`, {
        ...options,
        method: 'POST',
        body,
      }) as Promise<BranchResponse>,

    // Wallet
    getWallet: (options) => fetcher('/wallet', { ...options, method: 'GET' }) as Promise<WalletResponse>,
    topUpWallet: (body, options) =>
      fetcher('/wallet/top-up', { ...options, method: 'POST', body }) as Promise<WalletResponse>,

    // Referrals
    getReferral: (options) =>
      fetcher('/referrals/me', { ...options, method: 'GET' }) as Promise<ReferralResponse>,
    shareReferral: (body, options) =>
      fetcher('/referrals/share', { ...options, method: 'POST', body }) as Promise<ReferralResponse>,

    // Settings
    getSettings: (options) =>
      fetcher('/me/settings', { ...options, method: 'GET' }) as Promise<SettingsResponse>,
    updateSettings: (body, options) =>
      fetcher('/me/settings', { ...options, method: 'PUT', body }) as Promise<SettingsResponse>,

    // Legacy
    getPlayTurn: (scenarioId, options) =>
      fetcher(`/scenarios/${encodeURIComponent(scenarioId)}/play-turn`, {
        ...options,
        method: 'GET',
      }) as Promise<PlayTurnLegacyResponse>,
    submitChoice: (scenarioId, body, options) =>
      fetcher(`/scenarios/${encodeURIComponent(scenarioId)}/play-turn`, {
        ...options,
        method: 'POST',
        body,
      }) as Promise<PlayTurnLegacyResponse>,
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

// Re-export shapes for convenience.
export type {
  AdventureResource,
  AdventureStatus,
  AuthTokenResource,
  BranchResource,
  ReferralResource,
  ScenarioResource,
  ScenarioVersionResource,
  SettingsResource,
  SuggestedChoice,
  TurnResource,
  UserResource,
  WalletResource,
};
