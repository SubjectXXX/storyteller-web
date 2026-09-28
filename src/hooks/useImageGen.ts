/**
 * `useImageGen` — Stage 6 hook that issues an image-generation job and
 * polls until it resolves to `completed` or `failed`.
 *
 * Wire contract (verified against the API, see `src/fixtures/data.ts`
 * for the field-by-field mapping):
 *
 *   POST /api/adventures/{id}/turns/{turnId}/image
 *     body: { prompt: string, negative_prompt?: string, model?: string }
 *     200 (already completed) or 202 (still running)
 *     response: ImageJobResponse { job_id: int, status, asset_url }
 *
 *   GET /api/image-jobs/{jobId}          // whereNumber -> int id
 *     response: ImageJobResponse (adds latency_ms, error, started_at,
 *     completed_at; `error` is a plain string)
 *
 *   GET /api/adventures/{id}/images
 *     response: { adventure_id, assets: ImageAsset[] }   // carousel list
 *
 * The turn is addressed by the *path*, so the body carries only the
 * prompt — the server resolves the branch from the turn row and ignores
 * any `turn_id` we might send. Jobs start in `pending`, not `queued`.
 *
 * Errors:
 *   - 404: adventure or turn not owned by the caller (both the create
 *     and the poll endpoint answer 404 rather than leak existence).
 *   - 422: prompt rejected (empty or > 4000 chars).
 *   The return value exposes the API error verbatim so the panel can
 *   show the upstream message.
 *
 * Offline degrade: `withFixtureFallback` (the default app fetcher) swaps
 * in fixtures only for a *transport* failure — a `TypeError` from
 * `fetch`, never an `ApiError` with an HTTP status. A 401/403/404/422/5xx
 * is a real server answer and must surface as an error, so this hook
 * never inspects or substitutes response data itself.
 *
 * The hook deliberately returns a *flat* object (`jobId`, `status`,
 * `asset`, `error`, `isLoading`) rather than the raw TanStack Query so
 * callers don't have to know whether they're in `loading`, `pending`,
 * or `paused`. The internal `useQuery` is enabled by `branchId` and
 * `turnId` so an invalid argument disables it cleanly.
 */
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ApiError,
  type ImageAsset,
  type ImageCarouselResponseShape,
  type ImageJobResponseShape,
  type ImageJobStatus,
} from '@/api-client';
import { useApiClient } from '@/api-client';

export const imageKeys = {
  all: ['image'] as const,
  job: (jobId: string | undefined) =>
    [...imageKeys.all, 'job', jobId ?? '__missing__'] as const,
  carousel: (adventureId: number | undefined) =>
    [...imageKeys.all, 'carousel', adventureId ?? '__missing__'] as const,
} as const;

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 60_000;

/**
 * Intrinsic size advertised for the single-image asset the hook builds
 * from a completed job. The poll response carries `asset_url` only — no
 * asset row, no dimensions — so the panel needs a stable box to render
 * before the image loads.
 */
const GENERATED_ASSET_SIZE = { width: 1280, height: 720 } as const;

export interface UseImageJobResult {
  readonly jobId: string | null;
  readonly status: ImageJobStatus | 'idle';
  readonly asset: ImageAsset | null;
  readonly error: { readonly message: string; readonly code?: string } | null;
  readonly isLoading: boolean;
  /**
   * Programmatic re-issue. The component calls this when the player
   * presses "Regenerate" with a new prompt. Resets the local state so
   * the panel can show the loading skeleton again.
   */
  readonly regenerate: (nextPrompt?: string) => void;
}

/**
 * Build the panel-facing asset from a resolved job. The job itself only
 * carries `asset_url`; the carousel asset rows come from
 * `GET /adventures/{id}/images` and are a different (richer) shape.
 */
function assetFromJob(data: ImageJobResponseShape, prompt: string): ImageAsset | null {
  if (data.status !== 'completed') return null;
  if (typeof data.asset_url !== 'string' || data.asset_url.length === 0) return null;
  return {
    id: data.job_id,
    url: data.asset_url,
    width: GENERATED_ASSET_SIZE.width,
    height: GENERATED_ASSET_SIZE.height,
    alt: `Generated scene for: ${prompt}`,
    mime_type: null,
    created_at: data.completed_at ?? data.started_at ?? null,
  };
}

/**
 * `useImageJob` — kicks off an image-generation job and polls it until
 * the API reports `completed` or `failed`. The initial render is
 * `idle` until either the create call resolves or `regenerate()` is
 * called explicitly.
 *
 * Cleanup: the polling loop watches an AbortController so unmounting
 * the panel mid-flight aborts the in-flight request without leaking.
 */
export function useImageJob(
  adventureId: number | undefined,
  branchId: number | undefined,
  turnId: number | undefined,
  initialPrompt: string,
): UseImageJobResult {
  const api = useApiClient();
  const [currentPrompt, setCurrentPrompt] = useState(initialPrompt);
  const [jobId, setJobId] = useState<string | null>(null);
  const [regenerateNonce, setRegenerateNonce] = useState(0);

  // 1) Create the job. The query is enabled once the player has a
  // valid branch + turn id; the create call returns an ImageJobResponse
  // that we then surface via `jobId` to the polling query below.
  const createQuery = useQuery<ImageJobResponseShape, ApiError>({
    queryKey: [
      ...imageKeys.job(undefined),
      'create',
      adventureId,
      branchId,
      turnId,
      currentPrompt,
      regenerateNonce,
    ] as const,
    queryFn: ({ signal }) => {
      if (adventureId === undefined || turnId === undefined) {
        throw new ApiError(400, {
          message: 'adventureId and turnId are required',
          code: 'missing_args',
        });
      }
      if (currentPrompt.trim().length === 0) {
        throw new ApiError(422, {
          message: 'prompt is required',
          code: 'validation',
        });
      }
      return api.createImageJob(
        adventureId,
        turnId,
        // The turn is addressed by the path segment; `SubmitImageJobRequest`
        // only accepts `prompt`, `negative_prompt` and `model`.
        { prompt: currentPrompt },
        { signal },
      );
    },
    enabled:
      typeof adventureId === 'number' &&
      typeof turnId === 'number' &&
      // R24 DI-1 follow-on: only auto-create a job once the player
      // presses Regenerate. Before this guard, the panel fired a
      // `POST /api/adventures/{id}/turns/{turnId}/image` on every
      // mount, which 404'd when the adventure had no completed turn
      // yet. The first create call now happens behind the button.
      regenerateNonce > 0,
    // Treat the create response as a transient step; we surface status
    // through `pollQuery` so this stays in `idle` from the consumer's
    // perspective after the first resolve.
    staleTime: Infinity,
    retry: false,
  });

  // Surface the resolved job id as soon as the create call resolves.
  // The server hands back an integer (`whereNumber` on the poll route),
  // so anything else is a contract break we refuse to poll with — a
  // non-numeric id would 404 on every poll and read as "no image".
  const lastSeenCreateIdRef = useRef<string | null>(null);
  const rawJobId = createQuery.data?.job_id;
  const jobIdIsMalformed = rawJobId !== undefined && !Number.isInteger(rawJobId);
  const createdJobId =
    typeof rawJobId === 'number' && Number.isInteger(rawJobId) ? String(rawJobId) : null;
  useEffect(() => {
    if (createdJobId && createdJobId !== lastSeenCreateIdRef.current) {
      lastSeenCreateIdRef.current = createdJobId;
      setJobId(createdJobId);
    }
  }, [createdJobId]);

  // 2) Poll the job until it resolves. We use `useQuery` with a manual
  // `refetchInterval` rather than `setInterval` so the polling lifecycle
  // hooks into TanStack Query's mount/unmount story cleanly.
  const pollQuery = useQuery<ImageJobResponseShape, ApiError>({
    queryKey: imageKeys.job(jobId ?? undefined),
    queryFn: ({ signal }) => {
      if (!jobId) {
        throw new ApiError(400, { message: 'jobId is required', code: 'missing_id' });
      }
      return api.getImageJob(jobId, { signal });
    },
    enabled: typeof jobId === 'string' && jobId.length > 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'completed' || status === 'failed') return false;
      return POLL_INTERVAL_MS;
    },
    refetchIntervalInBackground: false,
    retry: false,
  });

  // 3) Local timeout: if the job stays in `queued` or `generating` past
  // `POLL_TIMEOUT_MS`, surface a synthetic error so the panel can show
  // a retry button instead of spinning forever.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!jobId) return undefined;
    setTimedOut(false);
    const startedAt = Date.now();
    const handle = window.setInterval(() => {
      if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        setTimedOut(true);
        window.clearInterval(handle);
      }
    }, 1000);
    return () => window.clearInterval(handle);
  }, [jobId, regenerateNonce]);

  // A job that the server rejected is `failed` even when we never got a
  // body back (422 on create, 404 on poll). Reporting `idle` there would
  // hide the error from the panel, which only renders it on `failed`.
  const queryFailed = createQuery.isError || pollQuery.isError;
  const status: ImageJobStatus | 'idle' =
    timedOut || queryFailed
      ? 'failed'
      : pollQuery.data?.status ?? (createQuery.isFetching ? 'pending' : 'idle');

  const asset: ImageAsset | null = pollQuery.data
    ? assetFromJob(pollQuery.data, currentPrompt)
    : null;

  const error: { readonly message: string; readonly code?: string } | null =
    jobIdIsMalformed
      ? { message: 'Image job id was not a number; refusing to poll.', code: 'contract_mismatch' }
      : timedOut
        ? { message: 'Image generation timed out', code: 'poll_timeout' }
        : pollQuery.data?.status === 'failed' && pollQuery.data.error
          ? { message: pollQuery.data.error, code: 'image_job_failed' }
          : pollQuery.error
            ? { message: pollQuery.error.message, code: pollQuery.error.code }
            : createQuery.error
              ? { message: createQuery.error.message, code: createQuery.error.code }
              : null;

  const isLoading =
    !timedOut &&
    (createQuery.isFetching || (status === 'pending' || status === 'generating'));

  const regenerate = (nextPrompt?: string) => {
    if (typeof nextPrompt === 'string') setCurrentPrompt(nextPrompt);
    setJobId(null);
    lastSeenCreateIdRef.current = null;
    setRegenerateNonce((n) => n + 1);
  };

  return { jobId, status, asset, error, isLoading, regenerate };
}

/**
 * `useImageCarousel` — read-only carousel of every image generated for
 * the active adventure. The hook is independent of `useImageJob` so the
 * panel can render the gallery before any generation resolves.
 */
export function useImageCarousel(
  adventureId: number | undefined,
): ReturnType<typeof useQuery<ImageCarouselResponseShape, ApiError>> {
  const api = useApiClient();
  return useQuery<ImageCarouselResponseShape, ApiError>({
    queryKey: imageKeys.carousel(adventureId),
    queryFn: ({ signal }) => {
      if (adventureId === undefined) {
        throw new ApiError(400, {
          message: 'Adventure id is required',
          code: 'missing_id',
        });
      }
      return api.getAdventureImages(adventureId, { signal });
    },
    enabled: typeof adventureId === 'number',
    staleTime: 30_000,
  });
}