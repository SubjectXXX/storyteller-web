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
  ADVENTURE_SETTINGS_FIXTURE,
  AUTH_FIXTURE,
  BRANCH_TREE_FIXTURE,
  CHARACTER_FIXTURE,
  CLOCK_TICK_FIXTURE,
  EFFECTIVE_SETTINGS_FIXTURE,
  NPC_ROSTER_FIXTURE,
  PLAY_FIXTURE,
  PLAYER_SETTINGS_FIXTURE,
  RECAP_FIXTURE,
  REFERRAL_RESOURCE_FIXTURE,
  SCENARIO_RESOURCE_FIXTURES,
  SCENARIO_VERSION_FIXTURE,
  SETTINGS_RESOURCE_FIXTURE,
  TURN_FIXTURE,
  WALLET_RESOURCE_FIXTURE,
  type AdventureResource,
  type AdventureSettingGroup,
  type AdventureSettingsResource,
  type AdventureSettingsUpdateRequest,
  type AdventureStatus,
  type AuthTokenResource,
  type BranchRedoRequest,
  type BranchResource,
  type BranchRetryRequest,
  type BranchTreeNode,
  type BranchTreeResponse,
  type BranchUndoRequest,
  type CharacterResource,
  type CharacterStat,
  type CharacterTrait,
  type ClockTickFixture,
  type DiceRollFixture,
  type EffectiveSettingsResource,
  type MechanicEventFixture,
  type NpcRelationship,
  type NpcRelationshipKind,
  type NpcResource,
  type PlayerSettingsResource,
  type PlayerSettingsUpdateRequest,
  type PlayTurnFixture,
  type RecapResource,
  type RecapTurn,
  type ReferralResource,
  type ScenarioFixture,
  type ScenarioResource,
  type ScenarioVersionResource,
  type SettingsResource,
  type SettingGroupFixture,
  type SettingGroupState,
  type SettingSource,
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

// ---------- Stage 4 — World panels (S4-T01) ------------------------------

/**
 * `GET /api/adventures/{id}/character` — the active branch's player
 * character resource (S4-T01). The 503 case signals "scenario does not
 * model characters" and is handled by rendering an `EmptyState` rather
 * than a hard error.
 */
export type CharacterDetailResponse = CharacterResource;
export type NpcListResponse = ReadonlyArray<NpcResource>;

/**
 * `GET /api/adventures/{id}/recap` (Stage 5 placeholder). The endpoint is
 * not yet wired on the API; a 404 means the player should see the
 * "Coming in Stage 5" placeholder. The contract lives in the SPA today so
 * swapping the API worker in is a one-line change.
 */
export type RecapResponse = RecapResource;

// ---------- Stage 4 — Branch tree + ops (S4-T03) -------------------------

export type BranchTreeResponseShape = BranchTreeResponse;
export type BranchOpResponse = BranchResource;

/**
 * `POST /api/adventures/{adventureId}/branches/{branchId}/retry`
 * Body: `BranchRetryRequest`; returns `BranchOpResponse`.
 */
export type BranchRetryRequestBody = BranchRetryRequest;
export type BranchUndoRequestBody = BranchUndoRequest;
export type BranchRedoRequestBody = BranchRedoRequest;

// ---------- Stage 4 — Settings (S4-T05 + S4-T06) -------------------------

export type AdventureSettingsResponse = AdventureSettingsResource;
export type AdventureSettingsRequest = AdventureSettingsUpdateRequest;
export type EffectiveSettingsResponse = EffectiveSettingsResource;

/**
 * `GET /api/me/settings/player-defaults` — the user-defaults document that
 * powers `<UserSettingsPage>`. Distinct from `SettingsResponse` (the S2
 * preferences document) because S4 introduces ten new user-default keys.
 */
export type PlayerSettingsResponse = PlayerSettingsResource;
export type PlayerSettingsUpdateRequestBody = PlayerSettingsUpdateRequest;

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

// ---------- AI status ----------------------------------------------------

/**
 * Public, read-only LLM provider status. The API exposes this so the SPA
 * can show a "Provider: …" pill on the home page even when the
 * authentication-gated endpoints are unreachable. The SPA calls
 * `GET /api/admin/ai/status` on every mount via TanStack Query (the API
 * worker pins `staleTime: 30s`).
 */
export interface AiStatusResponse {
  readonly provider: 'fake' | 'lmstudio' | 'unknown';
  readonly model: string;
  readonly base_url: string;
  readonly reachable: boolean;
}

// ---------- Streaming SSE -------------------------------------------------

/**
 * One chunk of a streamed turn. The LLM emits narration token-by-token;
 * the API multiplexes these into a single SSE channel alongside a final
 * `usage` event so the player can render a token meter and a typewriter
 * reveal at the same time.
 *
 * The `chunk` event arrives once per token. `usage` arrives exactly once
 * at the end of a turn, before the `end` event. `end` closes the stream;
 * `error` surfaces upstream failures (timeout, model overload).
 */
export type StreamEvent =
  | {
      readonly type: 'turn';
      readonly turn_id: number;
      readonly chunk_index: number;
      readonly narration: string;
    }
  | {
      readonly type: 'usage';
      readonly input_tokens: number;
      readonly output_tokens: number;
      readonly total_tokens: number;
      readonly latency_ms: number;
      readonly model: string;
      readonly finish_reason: 'stop' | 'length' | 'content_filter' | 'error';
      readonly cost_credits: number;
    }
  | { readonly type: 'end' }
  | { readonly type: 'error'; readonly message: string; readonly code?: string };

/**
 * Per-turn metering the API surfaces on the `usage` event. The SPA uses
 * this to render the `<TokenMeter>` badge and to deduct credits from the
 * player wallet after a turn settles.
 */
export interface TurnUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  readonly latencyMs: number;
  readonly model: string;
  readonly finishReason: 'stop' | 'length' | 'content_filter' | 'error';
  readonly costCredits: number;
}

/**
 * Discriminated `usage` payload variant exposed alongside `StreamEvent`.
 * The parser emits this directly so the React layer can consume a
 * `{ type: 'usage', usage: TurnUsage }` shape, but the wire format still
 * arrives as flat snake_case fields. The two variants are equivalent;
 * `TurnUsageEvent` is just a friendlier shape.
 */
export type TurnUsageEvent = {
  readonly type: 'usage';
  readonly usage: TurnUsage;
};

/**
 * Typed consumption contract for the adventure SSE stream. Pages pass one
 * of these to `streamAdventure()`; the implementation dispatches each
 * parsed event to the matching handler. The `signal` lets the caller
 * cancel mid-stream (e.g. when the player navigates away).
 */
export interface StreamHandlers {
  readonly signal: AbortSignal;
  readonly onTurn?: (payload: {
    readonly turnId: number;
    readonly chunkIndex: number;
    readonly narration: string;
  }) => void;
  readonly onUsage?: (payload: TurnUsage) => void;
  readonly onEnd?: () => void;
  readonly onError?: (payload: { message: string; code?: string }) => void;
}

/**
 * Per-turn metering the API surfaces on the `usage` event. The SPA uses
 * this to render the `<TokenMeter>` badge and to deduct credits from the
 * player wallet after a turn settles.
 */
export interface TurnUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  readonly latencyMs: number;
  readonly model: string;
  readonly finishReason: 'stop' | 'length' | 'content_filter' | 'error';
  readonly costCredits: number;
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

  // Stage 4 — World panels (S4-T01)
  readonly getCharacter: (adventureId: number, options?: RequestOptions) => Promise<CharacterDetailResponse>;
  readonly getNpcs: (adventureId: number, options?: RequestOptions) => Promise<NpcListResponse>;
  readonly getRecap: (adventureId: number, options?: RequestOptions) => Promise<RecapResponse>;

  // Stage 4 — Branch tree + ops (S4-T03)
  readonly getBranchTree: (adventureId: number, options?: RequestOptions) => Promise<BranchTreeResponseShape>;
  readonly retryBranch: (
    adventureId: number,
    branchId: number,
    body: BranchRetryRequestBody,
    options?: RequestOptions,
  ) => Promise<BranchOpResponse>;
  readonly undoBranch: (
    adventureId: number,
    branchId: number,
    body: BranchUndoRequestBody,
    options?: RequestOptions,
  ) => Promise<BranchOpResponse>;
  readonly redoBranch: (
    adventureId: number,
    branchId: number,
    body: BranchRedoRequestBody,
    options?: RequestOptions,
  ) => Promise<BranchOpResponse>;

  // Stage 4 — Settings (S4-T05 + S4-T06)
  readonly getAdventureSettings: (
    adventureId: number,
    options?: RequestOptions,
  ) => Promise<AdventureSettingsResponse>;
  readonly updateAdventureSettings: (
    adventureId: number,
    body: AdventureSettingsRequest,
    options?: RequestOptions,
  ) => Promise<AdventureSettingsResponse>;
  readonly getEffectiveSettings: (
    adventureId: number,
    branchId: number | undefined,
    options?: RequestOptions,
  ) => Promise<EffectiveSettingsResponse>;
  readonly getPlayerSettings: (options?: RequestOptions) => Promise<PlayerSettingsResponse>;
  readonly updatePlayerSettings: (
    body: PlayerSettingsUpdateRequestBody,
    options?: RequestOptions,
  ) => Promise<PlayerSettingsResponse>;

  // AI provider (public, no auth)
  readonly getAiStatus: (options?: RequestOptions) => Promise<AiStatusResponse>;

  // Streaming SSE
  readonly streamAdventure: (
    id: number,
    opts: { sinceTurnId?: number } & StreamHandlers,
  ) => Promise<void>;

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

// ---------- Streaming SSE consumer -----------------------------------------

export function parseStreamEvent(raw: unknown): StreamEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const type = obj.type;
  if (type === 'turn') {
    const turnId = Number(obj.turn_id ?? obj.turnId);
    const chunkIndex = Number(obj.chunk_index ?? obj.chunkIndex ?? 0);
    const narration = typeof obj.narration === 'string' ? obj.narration : '';
    if (!Number.isFinite(turnId)) return null;
    return {
      type: 'turn',
      turn_id: turnId,
      chunk_index: chunkIndex,
      narration,
    };
  }
  if (type === 'usage') {
    const finishReason: TurnUsage['finishReason'] =
      obj.finish_reason === 'length' ||
      obj.finish_reason === 'content_filter' ||
      obj.finish_reason === 'error'
        ? obj.finish_reason
        : 'stop';
    return {
      type: 'usage',
      input_tokens: Number(obj.input_tokens ?? 0),
      output_tokens: Number(obj.output_tokens ?? 0),
      total_tokens: Number(obj.total_tokens ?? 0),
      latency_ms: Number(obj.latency_ms ?? 0),
      model: typeof obj.model === 'string' ? obj.model : 'unknown',
      finish_reason: finishReason,
      cost_credits: Number(obj.cost_credits ?? 0),
    };
  }
  if (type === 'end') return { type: 'end' };
  if (type === 'error') {
    return {
      type: 'error',
      message: typeof obj.message === 'string' ? obj.message : 'Stream error',
      code: typeof obj.code === 'string' ? obj.code : undefined,
    };
  }
  return null;
}

/**
 * Dispatch a parsed `StreamEvent` to the matching handler on `handlers`.
 * Missing handlers are silently skipped so the caller only wires up the
 * callbacks it cares about. We coerce `turn` into the compact payload
 * shape `useAdventureStream` exposes to React components.
 */
function dispatchStreamEvent(event: StreamEvent, handlers: StreamHandlers): void {
  if (event.type === 'turn') {
    handlers.onTurn?.({
      turnId: event.turn_id,
      chunkIndex: event.chunk_index,
      narration: event.narration,
    });
    return;
  }
  if (event.type === 'usage') {
    const usage: TurnUsage = {
      inputTokens: event.input_tokens,
      outputTokens: event.output_tokens,
      totalTokens: event.total_tokens,
      latencyMs: event.latency_ms,
      model: event.model,
      finishReason: event.finish_reason,
      costCredits: event.cost_credits,
    };
    handlers.onUsage?.(usage);
    return;
  }
  if (event.type === 'end') {
    handlers.onEnd?.();
    return;
  }
  if (event.type === 'error') {
    handlers.onError?.({ message: event.message, code: event.code });
  }
}

/**
 * Buffer SSE chunks. The server emits events separated by `\n\n`; the
 * browser may split a single event across multiple chunks. We accumulate
 * raw bytes into `buffer` and slice complete events as `\n\n` appears.
 */
function sliceSseEvents(buffer: string): { events: string[]; rest: string } {
  const events: string[] = [];
  let idx = buffer.indexOf('\n\n');
  while (idx !== -1) {
    events.push(buffer.slice(0, idx));
    buffer = buffer.slice(idx + 2);
    idx = buffer.indexOf('\n\n');
  }
  return { events, rest: buffer };
}

/**
 * Pull the `data: …` payload out of a single SSE event frame. Comments
 * (lines starting with `:`) and other fields are ignored; the spec only
 * requires us to act on `data`.
 */
function readDataFrame(eventText: string): string | null {
  const lines = eventText.split('\n');
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith(':')) continue;
    if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trimStart());
    }
  }
  if (dataLines.length === 0) return null;
  return dataLines.join('\n');
}

/**
 * Open a streaming GET on `/api/adventures/{id}/stream` and pump events
 * into the supplied handlers until the server sends `end`, the
 * `AbortSignal` fires, or the connection drops. The function is a no-op
 * once the signal has already aborted.
 *
 * Fixture fallback: the dev sandbox ships with a fixture-mode stream so
 * the page renders even when the API is offline. We detect the offline
 * case by checking the `__STORYTELLER_FIXTURE_STREAM` global that
 * `withFixtureFallback` exposes, and emit a small canned turn.
 */
export async function consumeAdventureStream(
  adventureId: number,
  handlers: StreamHandlers,
  baseUrl: string = DEFAULT_BASE_URL,
  authToken?: string,
): Promise<void> {
  if (handlers.signal.aborted) return;
  const params = new URLSearchParams();
  const sinceTurnId = (handlers as unknown as { sinceTurnId?: number }).sinceTurnId;
  if (typeof sinceTurnId === 'number' && Number.isFinite(sinceTurnId)) {
    params.set('since_turn_id', String(sinceTurnId));
  }
  const qs = params.toString();
  const url = `${baseUrl}/adventures/${adventureId}/stream${qs ? `?${qs}` : ''}`;

  const headers: Record<string, string> = {
    Accept: 'text/event-stream',
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers,
      signal: handlers.signal,
      credentials: 'include',
    });
  } catch (err) {
    // Aborted fetches surface as `AbortError`/`DOMException`; everything
    // else is a real network failure. The page surfaces a "Stream
    // interrupted" banner via the `onError` handler.
    if (handlers.signal.aborted) return;
    const message = err instanceof Error ? err.message : String(err);
    dispatchStreamEvent(
      { type: 'error', message: `Network error: ${message}`, code: 'network' },
      handlers,
    );
    return;
  }

  if (!response.ok) {
    let bodyText = '';
    try {
      bodyText = await response.text();
    } catch {
      // ignore — bodyText stays empty
    }
    const errBody = extractErrorBody(
      bodyText.length > 0 ? safeParse(bodyText) : undefined,
      bodyText,
      response.statusText,
    );
    dispatchStreamEvent(
      {
        type: 'error',
        message: errBody.message || response.statusText || `HTTP ${response.status}`,
        code: errBody.code ?? `http_${response.status}`,
      },
      handlers,
    );
    return;
  }

  if (!response.body) {
    dispatchStreamEvent(
      { type: 'error', message: 'Stream response had no body', code: 'no_body' },
      handlers,
    );
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (!handlers.signal.aborted) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const { events, rest } = sliceSseEvents(buffer);
      buffer = rest;
      for (const eventText of events) {
        const data = readDataFrame(eventText);
        if (data === null) continue;
        if (data === '[DONE]') {
          dispatchStreamEvent({ type: 'end' }, handlers);
          return;
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(data);
        } catch {
          continue;
        }
        const event = parseStreamEvent(parsed);
        if (!event) continue;
        dispatchStreamEvent(event, handlers);
        if (event.type === 'end' || event.type === 'error') {
          // Drain and close. The reader.cancel below aborts the network
          // request so we don't leave the connection open.
          try {
            await reader.cancel();
          } catch {
            // ignore
          }
          return;
        }
      }
    }
  } catch (err) {
    if (handlers.signal.aborted) return;
    const message = err instanceof Error ? err.message : String(err);
    dispatchStreamEvent(
      { type: 'error', message: `Stream interrupted: ${message}`, code: 'stream_broken' },
      handlers,
    );
    return;
  }

  if (handlers.signal.aborted) return;
  // Stream ended without an explicit `end` event; surface it so the page
  // can drop its "Streaming…" indicator cleanly.
  dispatchStreamEvent({ type: 'end' }, handlers);
}

/**
 * Build a `ReadableStream<Uint8Array>` fixture the test suite (and the
 * offline dev shell) can pipe into `consumeAdventureStream` to exercise
 * the dispatch table without a live API.
 */
export function makeFixtureStream(events: ReadonlyArray<StreamEvent>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const lines = events.map((event) => `data: ${JSON.stringify(event)}\n\n`);
  // `flush` closes the connection after the last event so consumers see
  // `done: true` on their next reader.read().
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(line));
      controller.close();
    },
  });
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

    // ----- AI status (public) -----
    if (method === 'GET' && path_ === '/admin/ai/status') {
      return {
        provider: 'lmstudio',
        model: 'qwen2.5-7b-instruct',
        base_url: 'http://host.docker.internal:1234/v1',
        reachable: true,
      } satisfies AiStatusResponse;
    }

    // ----- Stage 4: World panels (S4-T01) -----
    if (method === 'GET' && /^\/adventures\/\d+\/character$/.test(path_)) {
      return CHARACTER_FIXTURE satisfies CharacterResource;
    }
    if (method === 'GET' && /^\/adventures\/\d+\/npcs$/.test(path_)) {
      return NPC_ROSTER_FIXTURE satisfies NpcListResponse;
    }
    if (method === 'GET' && /^\/adventures\/\d+\/recap$/.test(path_)) {
      // Stage 5 placeholder — fixture mode returns a populated recap so the
      // player can see what the panel will look like. The API worker will
      // ship a real implementation.
      return RECAP_FIXTURE satisfies RecapResponse;
    }

    // ----- Stage 4: Branch tree + ops (S4-T03) -----
    if (method === 'GET' && /^\/adventures\/\d+\/branches$/.test(path_) && !/\/branches\/\d+\/(retry|undo|redo)$/.test(path_)) {
      return BRANCH_TREE_FIXTURE satisfies BranchTreeResponse;
    }
    const branchOpMatch = path_.match(/^\/adventures\/(\d+)\/branches\/(\d+)\/(retry|undo|redo)$/);
    if (branchOpMatch && method === 'POST') {
      const [, , branchId, op] = branchOpMatch;
      const id = Number(branchId);
      const parent = BRANCH_TREE_FIXTURE.branches.find((b) => b.id === id) ?? BRANCH_TREE_FIXTURE.branches[0];
      if (!parent) {
        throw new ApiError(404, { message: `Branch ${id} not found`, code: 'not_found' });
      }
      if (op === 'retry' && !parent.can_retry) {
        throw new ApiError(422, {
          message: 'Branch does not allow retry.',
          code: 'branch_op_not_allowed',
        });
      }
      if (op === 'undo' && !parent.can_undo) {
        throw new ApiError(422, {
          message: 'Branch does not allow undo.',
          code: 'branch_op_not_allowed',
        });
      }
      if (op === 'redo' && !parent.can_redo) {
        throw new ApiError(422, {
          message: 'Branch does not allow redo.',
          code: 'branch_op_not_allowed',
        });
      }
      const next: BranchResource = {
        ...ADVENTURE_FIXTURE.current_branch,
        id: parent.id,
        name: parent.name,
        depth: parent.depth,
        version: ADVENTURE_FIXTURE.current_branch.version + 1,
        parent_branch_id: parent.parent_branch_id,
        parent_turn_id: parent.parent_turn_id,
        state: { ...ADVENTURE_FIXTURE.current_branch.state },
      };
      return next satisfies BranchResource;
    }

    // ----- Stage 4: Settings (S4-T05 + S4-T06) -----
    if (method === 'GET' && /^\/adventures\/\d+\/settings$/.test(path_)) {
      return ADVENTURE_SETTINGS_FIXTURE satisfies AdventureSettingsResource;
    }
    if (method === 'PUT' && /^\/adventures\/\d+\/settings$/.test(path_)) {
      const body = (options.body ?? {}) as AdventureSettingsUpdateRequest;
      const incoming = new Map(body.groups.map((g) => [g.id, g] as const));
      const groups = ADVENTURE_SETTINGS_FIXTURE.groups.map((group) => {
        const patch = incoming.get(group.id);
        if (!patch) return group;
        if (patch.state === 'override' && patch.value !== null) {
          return {
            ...group,
            value: patch.value,
            effective_value: patch.value,
            state: 'override' as const,
            source: 'adventure' as const,
          };
        }
        if (patch.state === 'reset') {
          return {
            ...group,
            state: 'reset' as const,
            source: 'scenario' as const,
          };
        }
        return { ...group, state: 'inherit' as const, source: 'user' as const };
      });
      return {
        ...ADVENTURE_SETTINGS_FIXTURE,
        groups,
        updated_at: new Date().toISOString(),
      } satisfies AdventureSettingsResource;
    }
    if (method === 'GET' && path_ === '/me/settings/effective') {
      const query = path.includes('?') ? path.slice(path.indexOf('?') + 1) : '';
      const params = new URLSearchParams(query);
      const branchId = Number(params.get('branch_id') ?? ADVENTURE_FIXTURE.current_branch.id);
      return {
        ...EFFECTIVE_SETTINGS_FIXTURE,
        branch_id: Number.isFinite(branchId) ? branchId : ADVENTURE_FIXTURE.current_branch.id,
      } satisfies EffectiveSettingsResource;
    }
    if (method === 'GET' && path_ === '/me/settings/player-defaults') {
      return PLAYER_SETTINGS_FIXTURE satisfies PlayerSettingsResource;
    }
    if (method === 'PUT' && path_ === '/me/settings/player-defaults') {
      const body = (options.body ?? {}) as PlayerSettingsUpdateRequest;
      return {
        ...PLAYER_SETTINGS_FIXTURE,
        ...body,
        updated_at: new Date().toISOString(),
      } satisfies PlayerSettingsResource;
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

export function createApi(fetcher: Fetcher, authToken?: string): ApiClient {
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

    // Stage 4 — World panels (S4-T01)
    getCharacter: (adventureId, options) =>
      fetcher(`/adventures/${adventureId}/character`, {
        ...options,
        method: 'GET',
      }) as Promise<CharacterDetailResponse>,
    getNpcs: (adventureId, options) =>
      fetcher(`/adventures/${adventureId}/npcs`, {
        ...options,
        method: 'GET',
      }) as Promise<NpcListResponse>,
    getRecap: (adventureId, options) =>
      fetcher(`/adventures/${adventureId}/recap`, {
        ...options,
        method: 'GET',
      }) as Promise<RecapResponse>,

    // Stage 4 — Branch tree + ops (S4-T03)
    getBranchTree: (adventureId, options) =>
      fetcher(`/adventures/${adventureId}/branches`, {
        ...options,
        method: 'GET',
      }) as Promise<BranchTreeResponseShape>,
    retryBranch: (adventureId, branchId, body, options) =>
      fetcher(`/adventures/${adventureId}/branches/${branchId}/retry`, {
        ...options,
        method: 'POST',
        body,
      }) as Promise<BranchOpResponse>,
    undoBranch: (adventureId, branchId, body, options) =>
      fetcher(`/adventures/${adventureId}/branches/${branchId}/undo`, {
        ...options,
        method: 'POST',
        body,
      }) as Promise<BranchOpResponse>,
    redoBranch: (adventureId, branchId, body, options) =>
      fetcher(`/adventures/${adventureId}/branches/${branchId}/redo`, {
        ...options,
        method: 'POST',
        body,
      }) as Promise<BranchOpResponse>,

    // Stage 4 — Settings (S4-T05 + S4-T06)
    getAdventureSettings: (adventureId, options) =>
      fetcher(`/adventures/${adventureId}/settings`, {
        ...options,
        method: 'GET',
      }) as Promise<AdventureSettingsResponse>,
    updateAdventureSettings: (adventureId, body, options) =>
      fetcher(`/adventures/${adventureId}/settings`, {
        ...options,
        method: 'PUT',
        body,
      }) as Promise<AdventureSettingsResponse>,
    getEffectiveSettings: (adventureId, branchId, options) => {
      const params = new URLSearchParams();
      params.set('adventure_id', String(adventureId));
      if (typeof branchId === 'number') params.set('branch_id', String(branchId));
      return fetcher(`/me/settings/effective?${params.toString()}`, {
        ...options,
        method: 'GET',
      }) as Promise<EffectiveSettingsResponse>;
    },
    getPlayerSettings: (options) =>
      fetcher('/me/settings/player-defaults', {
        ...options,
        method: 'GET',
      }) as Promise<PlayerSettingsResponse>,
    updatePlayerSettings: (body, options) =>
      fetcher('/me/settings/player-defaults', {
        ...options,
        method: 'PUT',
        body,
      }) as Promise<PlayerSettingsResponse>,

    // AI provider (public)
    getAiStatus: (options) =>
      fetcher('/admin/ai/status', { ...options, method: 'GET' }) as Promise<AiStatusResponse>,

    // Streaming SSE — runs out-of-band of the `Fetcher` because it is a
    // long-lived request, not a single round trip. We expose a hook-level
    // wrapper in `useAdventures` so pages never call this directly.
    streamAdventure: async (adventureId, opts) => {
      const { sinceTurnId, ...handlers } = opts;
      const handlersWithSince = { ...handlers, sinceTurnId } as StreamHandlers & {
        sinceTurnId?: number;
      };
      await consumeAdventureStream(adventureId, handlersWithSince, DEFAULT_BASE_URL, authToken);
    },

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
  AdventureSettingsResource,
  AdventureSettingsUpdateRequest,
  AdventureSettingGroup,
  AdventureStatus,
  AuthTokenResource,
  BranchRedoRequest,
  BranchResource,
  BranchRetryRequest,
  BranchTreeNode,
  BranchTreeResponse,
  BranchUndoRequest,
  CharacterResource,
  CharacterStat,
  CharacterTrait,
  ClockTickFixture,
  DiceRollFixture,
  EffectiveSettingsResource,
  MechanicEventFixture,
  NpcRelationship,
  NpcRelationshipKind,
  NpcResource,
  PlayerSettingsResource,
  PlayerSettingsUpdateRequest,
  RecapResource,
  RecapTurn,
  ReferralResource,
  ScenarioResource,
  ScenarioVersionResource,
  SettingsResource,
  SettingGroupState,
  SettingSource,
  SuggestedChoice,
  TurnResource,
  UserResource,
  WalletResource,
};

export {
  ADVENTURE_SETTINGS_FIXTURE,
  BRANCH_TREE_FIXTURE,
  CHARACTER_FIXTURE,
  CLOCK_TICK_FIXTURE,
  EFFECTIVE_SETTINGS_FIXTURE,
  NPC_ROSTER_FIXTURE,
  PLAYER_SETTINGS_FIXTURE,
  RECAP_FIXTURE,
};
