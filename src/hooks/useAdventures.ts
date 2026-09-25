import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useApiClient } from '@/api-client';
import {
  ApiError,
  type AdventureDetailResponse,
  type AdventureListResponse,
  type BranchResponse,
  type CreateBranchRequest,
  type StartAdventureRequest,
  type StreamHandlers,
  type SubmitTurnRequest,
  type TurnResponse,
  type TurnUsage,
} from '@/api-client';
import { useAuth } from '@/auth/useAuth';

export const adventureKeys = {
  all: ['adventures'] as const,
  list: () => [...adventureKeys.all, 'list'] as const,
  detail: (id: number | undefined) => [...adventureKeys.all, 'detail', id ?? '__missing__'] as const,
};

export function useAdventures(): UseQueryResult<AdventureListResponse, ApiError> {
  const api = useApiClient();
  // R24 DI-4: TopNav mounts the list query on every route (including
  // /web/login). Without this gate, an unauthenticated visitor would
  // see `GET /api/adventures → 401` in the Network tab every time
  // they hit the login screen. Disable the query until a bearer
  // token is hydrated so the request never leaves the browser.
  const { token } = useAuth();
  return useQuery<AdventureListResponse, ApiError>({
    queryKey: adventureKeys.list(),
    queryFn: ({ signal }) => api.listAdventures({ signal }),
    // Adventures are short-lived; always refetch when the window regains focus
    // so the player sees their latest `last_played_at` after closing the tab.
    refetchOnWindowFocus: true,
    enabled: token !== null,
  });
}

export function useAdventure(
  id: number | undefined,
): UseQueryResult<AdventureDetailResponse, ApiError> {
  const api = useApiClient();
  return useQuery<AdventureDetailResponse, ApiError>({
    queryKey: adventureKeys.detail(id),
    queryFn: ({ signal }) => {
      if (id === undefined) {
        throw new ApiError(400, {
          message: 'Adventure id is required',
          code: 'missing_id',
        });
      }
      return api.getAdventure(id, { signal });
    },
    enabled: typeof id === 'number',
    refetchOnWindowFocus: true,
  });
}

export function useStartAdventure(): UseMutationResult<
  AdventureDetailResponse,
  ApiError,
  StartAdventureRequest
> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation<AdventureDetailResponse, ApiError, StartAdventureRequest>({
    mutationFn: (body) => api.startAdventure(body),
    onSuccess: (adventure) => {
      queryClient.setQueryData(adventureKeys.detail(adventure.id), adventure);
      void queryClient.invalidateQueries({ queryKey: adventureKeys.list() });
    },
  });
}

export interface SubmitTurnContext {
  previous?: AdventureDetailResponse;
}

export function useSubmitTurn(
  adventureId: number,
): UseMutationResult<TurnResponse, ApiError, SubmitTurnRequest, SubmitTurnContext> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation<TurnResponse, ApiError, SubmitTurnRequest, SubmitTurnContext>({
    mutationFn: (body) => api.submitTurn(adventureId, body),
    // Optimistic concurrency: the server may reject with a 409 version_conflict
    // when the client's `client_version` is stale. We invalidate the cache on
    // success so the next read pulls the authoritative branch state.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adventureKeys.detail(adventureId) });
    },
  });
}

export function useCreateBranch(
  adventureId: number,
): UseMutationResult<BranchResponse, ApiError, CreateBranchRequest> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation<BranchResponse, ApiError, CreateBranchRequest>({
    mutationFn: (body) => api.createBranch(adventureId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adventureKeys.detail(adventureId) });
    },
  });
}

// ---------- Streaming -----------------------------------------------------

export interface AdventureStreamHandlers {
  /**
   * Called once per chunk. The hook appends `narration` to its own
   * buffer so `useAdventureStream` consumers can render a typewriter
   * reveal without doing their own concatenation.
   */
  readonly onTurn?: (payload: {
    readonly turnId: number;
    readonly chunkIndex: number;
    readonly narration: string;
  }) => void;
  /** Fires after the API closes the turn with its `usage` event. */
  readonly onUsage?: (usage: TurnUsage) => void;
  /** Fires once when the API emits `end` (or the connection drops). */
  readonly onEnd?: () => void;
  /** Fires when the stream emits an `error` event or the fetch fails. */
  readonly onError?: (payload: { readonly message: string; readonly code?: string }) => void;
}

export interface UseAdventureStreamOptions extends AdventureStreamHandlers {
  /**
   * Resume the stream from a specific turn id. The API worker filters
   * out chunks with `turn_id <= since_turn_id`, so passing `lastTurnId`
   * lets the page re-subscribe after a refresh without replaying chunks
   * the player already saw.
   */
  readonly sinceTurnId?: number;
  /**
   * Disable the stream without unmounting the hook. Defaults to `true`.
   * Set to `false` to pause consumption while keeping the buffer intact.
   */
  readonly enabled?: boolean;
}

export interface AdventureStreamState {
  /**
   * The full narration accumulated for the live turn. Resets to `''`
   * when a new turn starts. Pages can feed this directly into the
   * `<Typewriter>` component to render a reveal effect.
   */
  readonly liveNarration: string;
  /** The most recent turn id observed on the stream. */
  readonly liveTurnId: number | null;
  /** Monotonic chunk counter (resets per turn). */
  readonly liveChunkIndex: number;
  /** True while the SSE connection is open. */
  readonly streaming: boolean;
  /** Populated by the `error` event or a network failure. */
  readonly error: { readonly message: string; readonly code?: string } | null;
  /** Populated by the `usage` event. */
  readonly usage: TurnUsage | null;
}

/**
 * Subscribe to the `GET /api/adventures/{id}/stream` SSE endpoint.
 *
 * - Wraps `api.streamAdventure` in a `useEffect` with an `AbortController`
 *   so the underlying fetch is cancelled when the page unmounts or the
 *   player navigates away.
 * - Buffers `turn` chunks into `liveNarration` so the page can render a
 *   typewriter reveal without managing its own reducer.
 * - Captures the latest `usage` payload for `<TokenMeter>` and surfaces
 *   the `streaming` flag for `<TopNav>`'s "Streaming…" indicator.
 *
 * The hook is intentionally pure: it never invalidates TanStack Query
 * caches on `usage` (the page decides when to refetch the adventure
 * detail so it can show the new turn).
 */
export function useAdventureStream(
  id: number | undefined,
  options: UseAdventureStreamOptions = {},
): AdventureStreamState {
  const api = useApiClient();
  const [liveNarration, setLiveNarration] = useState<string>('');
  const [liveTurnId, setLiveTurnId] = useState<number | null>(null);
  const [liveChunkIndex, setLiveChunkIndex] = useState<number>(0);
  const [streaming, setStreaming] = useState<boolean>(false);
  const [usage, setUsage] = useState<TurnUsage | null>(null);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);

  // Keep the latest handler closure in a ref so we don't tear down the
  // stream every time the parent re-renders. Without this the
  // `useEffect` dep array would force a reconnect on every state update.
  const handlersRef = useRef<AdventureStreamHandlers | null>(null);
  handlersRef.current = {
    onTurn: options.onTurn,
    onUsage: options.onUsage,
    onEnd: options.onEnd,
    onError: options.onError,
  };

  useEffect(() => {
    if (id === undefined) return undefined;
    if (options.enabled === false) return undefined;
    const controller = new AbortController();

    // Reset the buffered state for a fresh subscription.
    setLiveNarration('');
    setLiveChunkIndex(0);
    setError(null);
    setStreaming(true);

    const handlerArgs: StreamHandlers & { sinceTurnId?: number } = {
      signal: controller.signal,
      onTurn: (payload) => {
        setLiveTurnId((prev) => (prev === payload.turnId ? prev : payload.turnId));
        setLiveChunkIndex(payload.chunkIndex);
        setLiveNarration((prev) =>
          prev && payload.chunkIndex === 0 ? payload.narration : prev + payload.narration,
        );
        handlersRef.current?.onTurn?.(payload);
      },
      onUsage: (payload) => {
        setUsage(payload);
        handlersRef.current?.onUsage?.(payload);
      },
      onEnd: () => {
        setStreaming(false);
        handlersRef.current?.onEnd?.();
      },
      onError: (payload) => {
        setError(payload);
        setStreaming(false);
        handlersRef.current?.onError?.(payload);
      },
    };
    if (options.sinceTurnId !== undefined) {
      handlerArgs.sinceTurnId = options.sinceTurnId;
    }

    void api.streamAdventure(id, handlerArgs).catch((err: unknown) => {
      // `streamAdventure` already routes errors through `onError`; the
      // catch here is defensive in case `api` throws before opening the
      // fetch (e.g. when the React tree is torn down mid-await).
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : String(err);
      const fallback = { message, code: 'stream_broken' };
      setError(fallback);
      setStreaming(false);
      handlersRef.current?.onError?.(fallback);
    });

    return () => {
      controller.abort();
      setStreaming(false);
    };
    // We deliberately only depend on `id` and the boolean switches; the
    // handlers stay live via `handlersRef` so reconnections don't churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, options.enabled, options.sinceTurnId, api]);

  return {
    liveNarration,
    liveTurnId,
    liveChunkIndex,
    streaming,
    error,
    usage,
  };
}
