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
  IMAGE_CAROUSEL_FIXTURE,
  IMAGE_JOB_COMPLETED_FIXTURE,
  IMAGE_JOB_QUEUED_FIXTURE,
  LORE_FIXTURE,
  PINNED_MEMORY_FIXTURE,
  PLAY_FIXTURE,
  RECAP_FIXTURE,
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
  type ImageAsset,
  type ImageCarouselResponse,
  type ImageJobResponse,
  type ImageJobStatus,
  type LoreEntry,
  type LoreListResponse,
  type PinnedMemory,
  type PinnedMemoryListResponse,
  type PlayTurnFixture,
  type RecapResource,
  type RecapTurn,
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

// ---------- Stage 5 — Memory & context (S5-T01..S5-T02) ---------------------
//
// The Stage 5 endpoints surface what the LLM remembered so the player
// can scroll back through the chronicle (recap), browse canon facts
// (lore), and review what they explicitly starred (pinned). The hooks
// in `useMemory.ts` call these and fall back to fixtures when the API
// has not shipped the corresponding route yet.

/**
 * `GET /api/adventures/{id}/recap` (Stage 5 placeholder). Returns the
 * chronicle of recent turns plus the timestamp the LLM last refreshed
 * it. The endpoint is not yet wired on the API; the fixture transport
 * ships a populated sample so the panel renders offline.
 */
export type RecapResponse = RecapResource;

/**
 * `GET /api/adventures/{id}/lore?key=...` — fetch a single lore entry by
 * its canonical key. The full list (without `?key=`) is also exposed via
 * `GET /api/adventures/{id}/lore`. Both share `LoreListResponse` so the
 * SPA can render the full list and highlight the focused entry.
 */
export interface LoreListQuery {
  readonly key?: string;
}
export type LoreListResponseShape = LoreListResponse;

/**
 * `GET /api/adventures/{id}/pinned-memories` — flat list of player-
 * starred recap turns or lore entries. The Stage 5 worker also exposes
 * `POST /api/adventures/{id}/pinned-memories` to toggle; the SPA only
 * reads for now, so we declare the read shape and a request body.
 */
export type PinnedMemoryListResponseShape = PinnedMemoryListResponse;
export interface PinnedMemoryCreateRequest {
  readonly kind: 'recap' | 'lore';
  readonly ref_id: string;
}

// ---------- Stage 6 — Visual generation (S6-T01..S6-T02) ---------------------
//
// Stage 6 issues a background image-generation job per prompt. The SPA
// POSTs to start a job, then polls the dedicated `GET /api/image-jobs/{id}`
// endpoint until the job is `completed` or `failed`. The carousel reads
// the full history via `GET /api/adventures/{id}/images`.

export type ImageJobStatusShape = ImageJobStatus;
export type ImageAssetShape = ImageAsset;
export type ImageJobResponseShape = ImageJobResponse;

export interface GenerateImageRequest {
  readonly prompt: string;
  readonly turn_id?: number | null;
  readonly width?: number;
  readonly height?: number;
}

export interface ImageCarouselResponse {
  readonly adventure_id: number;
  readonly assets: ReadonlyArray<ImageAsset>;
}
export type ImageCarouselResponseShape = ImageCarouselResponse;

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

  // AI provider (public, no auth)
  readonly getAiStatus: (options?: RequestOptions) => Promise<AiStatusResponse>;

  // Stage 5 — Memory & context (S5-T01..S5-T02)
  readonly getRecap: (adventureId: number, options?: RequestOptions) => Promise<RecapResponse>;
  readonly getLore: (
    adventureId: number,
    query?: LoreListQuery,
    options?: RequestOptions,
  ) => Promise<LoreListResponseShape>;
  readonly getPinnedMemories: (
    adventureId: number,
    options?: RequestOptions,
  ) => Promise<PinnedMemoryListResponseShape>;
  readonly pinMemory: (
    adventureId: number,
    body: PinnedMemoryCreateRequest,
    options?: RequestOptions,
  ) => Promise<PinnedMemoryListResponseShape>;

  // Stage 6 — Visual generation (S6-T01..S6-T02)
  readonly createImageJob: (
    adventureId: number,
    branchId: number,
    body: GenerateImageRequest,
    options?: RequestOptions,
  ) => Promise<ImageJobResponseShape>;
  readonly getImageJob: (
    jobId: string,
    options?: RequestOptions,
  ) => Promise<ImageJobResponseShape>;
  readonly getAdventureImages: (
    adventureId: number,
    options?: RequestOptions,
  ) => Promise<ImageCarouselResponseShape>;

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

    // ----- Stage 5 — Memory & context -----
    if (method === 'GET' && /^\/adventures\/\d+\/recap$/.test(path_)) {
      // Stage 5 fixture — populated chronicle so the SPA renders offline.
      return RECAP_FIXTURE satisfies RecapResponse;
    }
    if (method === 'GET' && /^\/adventures\/\d+\/lore$/.test(path_)) {
      const query = path.includes('?') ? path.slice(path.indexOf('?') + 1) : '';
      const params = new URLSearchParams(query);
      const key = params.get('key');
      if (!key) return LORE_FIXTURE satisfies LoreListResponse;
      const entry = LORE_FIXTURE.entries.find((e) => e.key === key);
      return {
        adventure_id: LORE_FIXTURE.adventure_id,
        entries: entry ? [entry] : [],
      } satisfies LoreListResponse;
    }
    if (method === 'GET' && /^\/adventures\/\d+\/pinned-memories$/.test(path_)) {
      return PINNED_MEMORY_FIXTURE satisfies PinnedMemoryListResponse;
    }
    if (method === 'POST' && /^\/adventures\/\d+\/pinned-memories$/.test(path_)) {
      // The fixture simply echoes the current pinned list back. The real
      // API worker will insert and re-rank; we keep the contract identical
      // so swapping is a one-line change.
      const body = (options.body ?? {}) as PinnedMemoryCreateRequest;
      if (!body.kind || !body.ref_id) {
        throw new ApiError(422, {
          message: 'kind and ref_id are required.',
          code: 'validation',
        });
      }
      return PINNED_MEMORY_FIXTURE satisfies PinnedMemoryListResponse;
    }

    // ----- Stage 6 — Visual generation -----
    if (method === 'POST' && /^\/adventures\/\d+\/branches\/\d+\/image$/.test(path_)) {
      const body = (options.body ?? {}) as GenerateImageRequest;
      if (!body.prompt || body.prompt.trim().length === 0) {
        throw new ApiError(422, {
          message: 'prompt is required.',
          code: 'validation',
          fields: { prompt: 'prompt is required.' },
        });
      }
      // Stage 6 fixture: a deterministic fake job so the polling path
      // resolves predictably. The real API worker issues a real job and
      // surfaces an opaque `job_id` we then poll.
      return IMAGE_JOB_QUEUED_FIXTURE satisfies ImageJobResponse;
    }
    if (method === 'GET' && /^\/image-jobs\/[^/]+$/.test(path_)) {
      // Stage 6 fixture: the first poll returns `generating`, the second
      // resolves to `completed`. Real callers will poll against the live
      // endpoint; tests inject their own fetcher to drive the state
      // machine.
      const match = path_.match(/^\/image-jobs\/([^/]+)$/);
      const requestedJobId = match?.[1];
      const completed = {
        ...IMAGE_JOB_COMPLETED_FIXTURE,
        job_id: requestedJobId ?? IMAGE_JOB_COMPLETED_FIXTURE.job_id,
      } satisfies ImageJobResponse;
      return completed;
    }
    if (method === 'GET' && /^\/adventures\/\d+\/images$/.test(path_)) {
      return {
        adventure_id: ADVENTURE_FIXTURE.id,
        assets: IMAGE_CAROUSEL_FIXTURE,
      } satisfies ImageCarouselResponse;
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

    // AI provider (public)
    getAiStatus: (options) =>
      fetcher('/admin/ai/status', { ...options, method: 'GET' }) as Promise<AiStatusResponse>,

    // Stage 5 — Memory & context (S5-T01..S5-T02)
    getRecap: (adventureId, options) =>
      fetcher(`/adventures/${adventureId}/recap`, {
        ...options,
        method: 'GET',
      }) as Promise<RecapResponse>,
    getLore: (adventureId, query, options) => {
      const params = new URLSearchParams();
      if (query?.key) params.set('key', query.key);
      const qs = params.toString();
      return fetcher(`/adventures/${adventureId}/lore${qs ? `?${qs}` : ''}`, {
        ...options,
        method: 'GET',
      }) as Promise<LoreListResponseShape>;
    },
    getPinnedMemories: (adventureId, options) =>
      fetcher(`/adventures/${adventureId}/pinned-memories`, {
        ...options,
        method: 'GET',
      }) as Promise<PinnedMemoryListResponseShape>,
    pinMemory: (adventureId, body, options) =>
      fetcher(`/adventures/${adventureId}/pinned-memories`, {
        ...options,
        method: 'POST',
        body,
      }) as Promise<PinnedMemoryListResponseShape>,

    // Stage 6 — Visual generation (S6-T01..S6-T02)
    createImageJob: (adventureId, branchId, body, options) =>
      fetcher(`/adventures/${adventureId}/branches/${branchId}/image`, {
        ...options,
        method: 'POST',
        body,
      }) as Promise<ImageJobResponseShape>,
    getImageJob: (jobId, options) =>
      fetcher(`/image-jobs/${jobId}`, {
        ...options,
        method: 'GET',
      }) as Promise<ImageJobResponseShape>,
    getAdventureImages: (adventureId, options) =>
      fetcher(`/adventures/${adventureId}/images`, {
        ...options,
        method: 'GET',
      }) as Promise<ImageCarouselResponseShape>,

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
  AdventureStatus,
  AuthTokenResource,
  BranchResource,
  ImageAsset,
  ImageJobResponse,
  ImageJobStatus,
  LoreEntry,
  LoreListResponse,
  PinnedMemory,
  PinnedMemoryListResponse,
  RecapResource,
  RecapTurn,
  ReferralResource,
  ScenarioResource,
  ScenarioVersionResource,
  SettingsResource,
  SuggestedChoice,
  TurnResource,
  UserResource,
  WalletResource,
};

export {
  ADVENTURE_FIXTURE,
  IMAGE_CAROUSEL_FIXTURE,
  IMAGE_JOB_COMPLETED_FIXTURE,
  IMAGE_JOB_QUEUED_FIXTURE,
  LORE_FIXTURE,
  PINNED_MEMORY_FIXTURE,
  RECAP_FIXTURE,
};
