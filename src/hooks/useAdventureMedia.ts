/**
 * `useAdventureMedia` — the player's *own* media folder for one adventure.
 *
 * This is deliberately a different surface from `<ImagePanel>`: that panel
 * shows the story's generated artwork (server-owned, read-only, regenerated
 * from a prompt). This hook backs the player's private folder — pictures
 * they upload themselves while playing, deleted by them, and never visible
 * to another player. `AdventureResource` carries no `user_id`; ownership is
 * enforced server-side, and the API answers 404 (never 403) when the
 * adventure is not the caller's, so a 404 here means "not yours", not
 * "empty folder".
 *
 * Wire contract:
 *
 *   GET    /api/adventures/{id}/media
 *     response: AdventureMediaResponse {
 *       adventure_id, folder: {id, name, path, scope},
 *       items: MediaItem[]           // always 200, `[]` when empty
 *     }
 *   POST   /api/adventures/{id}/media
 *     request:  multipart/form-data — `file` (required), `kind`
 *               (optional, defaults to `image`), `caption` (optional)
 *     response: MediaItem             // the created entry
 *   DELETE /api/adventures/{id}/media/{mediaId}
 *     response: { deleted: true, id }
 *
 * `MediaItem.url` is opaque: a short-lived signed S3 URL or a
 * gateway-relative path to local bytes. Callers render it verbatim and must
 * never build a storage path themselves.
 *
 * Errors:
 *   - 404: the adventure is not the caller's (or does not exist). The panel
 *     shows the message as-is rather than rendering an empty folder, so a
 *     player is never told "you have no media" about someone else's run.
 *   - 413: the file exceeds the per-upload ceiling. `ApiError.message` is
 *     surfaced verbatim (it carries the limit).
 *   - 422: the mime type is not allowed, or `file` was missing. The API's
 *     message + `fields` are surfaced verbatim.
 *
 * Both mutations invalidate `adventureMediaKeys.folder(adventureId)` on
 * success, so the grid re-reads the authoritative list (newest-first order
 * and server-computed `size_bytes`/`width`/`height` come from the API, not
 * from the browser).
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  ApiError,
  type AdventureMediaResponseShape,
  type MediaDeleteResponseShape,
  type MediaItem,
} from '@/api-client';
import { useApiClient } from '@/api-client';

export const adventureMediaKeys = {
  all: ['adventure-media'] as const,
  folder: (adventureId: number | undefined) =>
    [...adventureMediaKeys.all, 'folder', adventureId ?? '__missing__'] as const,
} as const;

/**
 * Read the folder + its items for one adventure. Disabled until the page
 * knows the numeric adventure id, so a bad route never fires a request.
 */
export function useAdventureMedia(
  adventureId: number | undefined,
): UseQueryResult<AdventureMediaResponseShape, ApiError> {
  const api = useApiClient();
  return useQuery<AdventureMediaResponseShape, ApiError>({
    queryKey: adventureMediaKeys.folder(adventureId),
    queryFn: ({ signal }) => {
      if (adventureId === undefined) {
        throw new ApiError(400, {
          message: 'Adventure id is required',
          code: 'missing_id',
        });
      }
      return api.getAdventureMedia(adventureId, { signal });
    },
    enabled: typeof adventureId === 'number',
    staleTime: 30_000,
  });
}

/**
 * Upload one file into the folder. The caller builds the `FormData`
 * (`file`, optional `kind`, optional `caption`) so the panel can show the
 * pending filename and the API's validation errors against the control the
 * player actually touched.
 */
export function useUploadAdventureMedia(
  adventureId: number | undefined,
): UseMutationResult<MediaItem, ApiError, FormData> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation<MediaItem, ApiError, FormData>({
    mutationFn: (form) => {
      if (adventureId === undefined) {
        throw new ApiError(400, {
          message: 'Adventure id is required',
          code: 'missing_id',
        });
      }
      return api.uploadAdventureMedia(adventureId, form);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adventureMediaKeys.folder(adventureId) });
    },
  });
}

/**
 * Delete one item from the folder. Takes the numeric `mediaId` (not the
 * whole item) so a stale row cannot delete a newer asset that reused the id.
 */
export function useDeleteAdventureMedia(
  adventureId: number | undefined,
): UseMutationResult<MediaDeleteResponseShape, ApiError, number> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation<MediaDeleteResponseShape, ApiError, number>({
    mutationFn: (mediaId) => {
      if (adventureId === undefined) {
        throw new ApiError(400, {
          message: 'Adventure id is required',
          code: 'missing_id',
        });
      }
      return api.deleteAdventureMedia(adventureId, mediaId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adventureMediaKeys.folder(adventureId) });
    },
  });
}
