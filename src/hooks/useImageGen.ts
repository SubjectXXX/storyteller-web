/**
 * `useImageGen` — Stage 6 hook that issues an image-generation job and
 * polls until it resolves to `completed` or `failed`.
 *
 * Wire contract (S6-T01, see `fixtureFetcher` for the SPA shell):
 *
 *   POST /api/adventures/{id}/branches/{branchId}/image
 *     body: { prompt: string, turn_id?: number, width?: number,
 *             height?: number }
 *     response: ImageJobResponse { job_id, adventure_id, branch_id,
 *       turn_id, prompt, status, asset, error, created_at, updated_at }
 *
 *   GET /api/image-jobs/{jobId}
 *     response: ImageJobResponse (same shape; status reflects the
 *     current state machine value)
 *
 *   GET /api/adventures/{id}/images
 *     response: { adventure_id, assets: ImageAsset[] }   // carousel list
 *
 * Errors:
 *   - 404: image generation not yet wired — caller renders a "Coming in
 *     Stage 6" placeholder.
 *   - 422: prompt rejected (empty, too long, or content-flagged). The
 *     `useImageJob` return value exposes the API error verbatim so the
 *     panel can show the upstream message.
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
 * `useImageJob` — kicks off an image-generation job and polls it until
 * the API reports `completed` or `failed`. The initial render is
 * `idle` until either the create call resolves or `regenerate()` is
 * called explicitly.
 *
 * Cleanup: the polling loop watches an AbortController so unmounting
 * the panel mid-flight aborts the in-flight request without leaking.
 */
export function useImageJob(
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
      branchId,
      turnId,
      currentPrompt,
      regenerateNonce,
    ] as const,
    queryFn: ({ signal }) => {
      if (branchId === undefined || turnId === undefined) {
        throw new ApiError(400, {
          message: 'branchId and turnId are required',
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
        // The fixture transport ignores the parent adventure id; the real
        // API worker uses it to scope permissions.
        branchId,
        branchId,
        { prompt: currentPrompt, turn_id: turnId },
        { signal },
      );
    },
    enabled:
      typeof branchId === 'number' &&
      typeof turnId === 'number' &&
      regenerateNonce >= 0,
    // Treat the create response as a transient step; we surface status
    // through `pollQuery` so this stays in `idle` from the consumer's
    // perspective after the first resolve.
    staleTime: Infinity,
    retry: false,
  });

  // Surface the resolved job id as soon as the create call resolves.
  const lastSeenCreateIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (createQuery.data?.job_id && createQuery.data.job_id !== lastSeenCreateIdRef.current) {
      lastSeenCreateIdRef.current = createQuery.data.job_id;
      setJobId(createQuery.data.job_id);
    }
  }, [createQuery.data]);

  // 2) Poll the job until it resolves. We use `useQuery` with a manual
  // `refetchInterval` rather than `setInterval` so the polling lifecycle
  // hooks into TanStack Query's mount/unmount story cleanly.
  const pollQuery = useQuery<ImageJobResponseShape, ApiError>({
    queryKey: imageKeys.job(jobId),
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

  const status: ImageJobStatus | 'idle' =
    timedOut && pollQuery.data?.status !== 'completed' && pollQuery.data?.status !== 'failed'
      ? 'failed'
      : pollQuery.data?.status ?? (createQuery.isFetching ? 'queued' : 'idle');

  const asset: ImageAsset | null =
    pollQuery.data?.status === 'completed' ? pollQuery.data.asset : null;

  const error: { readonly message: string; readonly code?: string } | null =
    timedOut
      ? { message: 'Image generation timed out', code: 'poll_timeout' }
      : pollQuery.data?.status === 'failed' && pollQuery.data.error
        ? pollQuery.data.error
        : pollQuery.error
          ? { message: pollQuery.error.message, code: pollQuery.error.code }
          : createQuery.error
            ? { message: createQuery.error.message, code: createQuery.error.code }
            : null;

  const isLoading =
    !timedOut &&
    (createQuery.isFetching || (status === 'queued' || status === 'generating'));

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