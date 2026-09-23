/**
 * `useMemory` — Stage 5 hooks that surface what the LLM remembered for
 * the active adventure. Three thin TanStack Query wrappers, all
 * fixture-backed today and one-line swappable when the API worker ships.
 *
 * Wire contracts (S5-T01 / S5-T02, see `fixtureFetcher` for the SPA
 * shell):
 *
 *   GET /api/adventures/{id}/recap
 *     { adventure_id, branch_id, generated_at, turns: [{ turn_id,
 *       sequence_number, headline, happened_at }] }
 *
 *   GET /api/adventures/{id}/lore?key=<key>   (omit ?key for the full list)
 *     { adventure_id, entries: [{ key, title, body, version, tags,
 *       scenario_slug, updated_at }] }
 *
 *   GET /api/adventures/{id}/pinned-memories
 *     { adventure_id, pinned: [{ id, kind, ref_id, title, body,
 *       pinned_at }] }
 *
 * Errors:
 *   - 404: the API has not shipped the endpoint yet — the consumer is
 *     responsible for rendering an "Coming in Stage 5" placeholder. The
 *     hooks do NOT mask the 404 because the page may want to react
 *     (e.g. show a different empty state for known-vs-unknown).
 *   - 503: the upstream memory extractor is down; consumers treat this
 *     identically to a transient failure.
 *
 * Caching: lore and recap are cheap to re-fetch but rarely change, so we
 * pin `staleTime` to 60s. Pinned memories can change as the player
 * stars new beats, so we use the default 0s (TanStack Query always
 * fetches on mount).
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  ApiError,
  type LoreEntry,
  type LoreListResponseShape,
  type PinnedMemory,
  type PinnedMemoryListResponseShape,
  type RecapResponse,
} from '@/api-client';
import { useApiClient } from '@/api-client';

export const memoryKeys = {
  all: ['memory'] as const,
  recap: (adventureId: number | undefined) =>
    [...memoryKeys.all, 'recap', adventureId ?? '__missing__'] as const,
  lore: (adventureId: number | undefined) =>
    [...memoryKeys.all, 'lore', adventureId ?? '__missing__'] as const,
  loreEntry: (adventureId: number | undefined, key: string | undefined) =>
    [...memoryKeys.lore(adventureId), 'entry', key ?? '__all__'] as const,
  pinned: (adventureId: number | undefined) =>
    [...memoryKeys.all, 'pinned', adventureId ?? '__missing__'] as const,
} as const;

const MEMORY_STALE_MS = 60_000;

/**
 * `useMemoryRecap` — fetch the recap resource (chronicle summary + last
 * N entries) for the active adventure. Use this from `<MemoryPanel>`'s
 * Recap tab; the panel renders the typewriter reveal against the
 * returned turns.
 */
export function useMemoryRecap(
  adventureId: number | undefined,
): UseQueryResult<RecapResponse, ApiError> {
  const api = useApiClient();
  return useQuery<RecapResponse, ApiError>({
    queryKey: memoryKeys.recap(adventureId),
    queryFn: ({ signal }) => {
      if (adventureId === undefined) {
        throw new ApiError(400, {
          message: 'Adventure id is required',
          code: 'missing_id',
        });
      }
      return api.getRecap(adventureId, { signal });
    },
    enabled: typeof adventureId === 'number',
    staleTime: MEMORY_STALE_MS,
  });
}

export interface UseMemoryLoreResult {
  readonly query: UseQueryResult<LoreListResponseShape, ApiError>;
  /**
   * The entry matching `key`, or `undefined` when the key is absent or
   * the API hasn't shipped the entry yet. Pre-computed so callers
   * don't have to scan the entries array.
   */
  readonly entry: LoreEntry | undefined;
}

/**
 * `useMemoryLore` — fetch the lore list, optionally filtering by key.
 * When `key` is provided the hook surfaces the matching entry on the
 * returned object so consumers can render the focused card without
 * re-iterating the list themselves.
 */
export function useMemoryLore(
  adventureId: number | undefined,
  key?: string,
): UseMemoryLoreResult {
  const api = useApiClient();
  const trimmedKey = typeof key === 'string' && key.length > 0 ? key : undefined;
  const query = useQuery<LoreListResponseShape, ApiError>({
    queryKey: memoryKeys.loreEntry(adventureId, trimmedKey),
    queryFn: ({ signal }) => {
      if (adventureId === undefined) {
        throw new ApiError(400, {
          message: 'Adventure id is required',
          code: 'missing_id',
        });
      }
      return api.getLore(adventureId, trimmedKey ? { key: trimmedKey } : undefined, { signal });
    },
    enabled: typeof adventureId === 'number',
    staleTime: MEMORY_STALE_MS,
  });
  const entry =
    trimmedKey && query.data
      ? query.data.entries.find((e) => e.key === trimmedKey)
      : undefined;
  return { query, entry };
}

/**
 * `useMemoryPinned` — fetch the player's pinned memories for the active
 * adventure. Empty list is a normal state (player has not starred
 * anything yet); consumers should render an `EmptyState`.
 */
export function useMemoryPinned(
  adventureId: number | undefined,
): UseQueryResult<PinnedMemoryListResponseShape, ApiError> {
  const api = useApiClient();
  return useQuery<PinnedMemoryListResponseShape, ApiError>({
    queryKey: memoryKeys.pinned(adventureId),
    queryFn: ({ signal }) => {
      if (adventureId === undefined) {
        throw new ApiError(400, {
          message: 'Adventure id is required',
          code: 'missing_id',
        });
      }
      return api.getPinnedMemories(adventureId, { signal });
    },
    enabled: typeof adventureId === 'number',
    // Pinned list mutates as the player stars new beats; keep it fresh.
    staleTime: 0,
  });
}