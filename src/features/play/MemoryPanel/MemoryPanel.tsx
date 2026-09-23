/**
 * `<MemoryPanel>` — Stage 5 chronicle surface for the active adventure.
 *
 * The panel renders three sub-tabs backed by `useMemoryRecap`,
 * `useMemoryLore`, and `useMemoryPinned`. Each tab delegates loading
 * and error states to its respective hook and renders an
 * `EmptyState` (or "Coming in Stage 5" placeholder when the API has
 * not shipped the endpoint yet — 404 from the dev shell).
 *
 * The recap tab reuses `<Typewriter>` so the chronicle reveal feels
 * native to the rest of the player surface. The lore tab supports
 * debounced search by key/title (200 ms).
 *
 * This is the S5-T01 / S5-T02 upgrade of the Stage 4 placeholder. The
 * component is presentation-only; the data flows through the hooks
 * so the panel can be replaced wholesale when the API worker lands
 * the real endpoints.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from 'react';
import { Card } from '@/ui/Card';
import { Pill } from '@/ui/Pill';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { LoadingPanel } from '@/components/LoadingPanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Typewriter } from '@/components/Typewriter';
import {
  useMemoryLore,
  useMemoryPinned,
  useMemoryRecap,
} from '@/hooks';
import { ApiError, type LoreEntry, type PinnedMemory, type RecapTurn } from '@/api-client';
import { LoreCard } from './LoreCard';

export type MemoryTab = 'recap' | 'lore' | 'pinned';

export interface MemoryPanelProps {
  readonly adventureId: number;
  /**
   * Default sub-tab. Defaults to `recap` so the panel lands on the
   * chronicle the player just played through.
   */
  readonly defaultTab?: MemoryTab;
  readonly title?: string;
}

const TABS: ReadonlyArray<{ readonly id: MemoryTab; readonly label: string }> = [
  { id: 'recap', label: 'Recap' },
  { id: 'lore', label: 'Lore' },
  { id: 'pinned', label: 'Pinned' },
];

const tabRowStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-1)',
  flexWrap: 'wrap',
  borderBottom: '1px solid var(--color-border)',
  paddingBottom: 'var(--space-1)',
};

const tabButtonBaseStyle: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-sm)',
  padding: 'var(--space-1) var(--space-3)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid transparent',
  cursor: 'pointer',
  minHeight: 'var(--control-touch-min)',
};

const tabButtonActiveStyle: CSSProperties = {
  ...tabButtonBaseStyle,
  background: 'var(--color-surface-muted)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-foreground)',
  fontWeight: 'var(--weight-medium)',
};

const tabButtonInactiveStyle: CSSProperties = {
  ...tabButtonBaseStyle,
  background: 'transparent',
  color: 'var(--color-foreground-muted)',
};

const turnRowStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-2)',
  alignItems: 'baseline',
  padding: 'var(--space-2) 0',
  borderBottom: '1px dashed var(--color-border)',
};

const searchRowStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-2)',
  alignItems: 'center',
  marginBottom: 'var(--space-3)',
};

const searchInputStyle: CSSProperties = {
  flex: 1,
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  padding: 'var(--space-1) var(--space-2)',
  background: 'var(--color-surface)',
  color: 'var(--color-foreground)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-sm)',
};

const listStyle: CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'grid',
  gap: 'var(--space-2)',
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function formatHappenedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function isLoreEntry(value: unknown): value is LoreEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as LoreEntry).key === 'string' &&
    typeof (value as LoreEntry).title === 'string'
  );
}

function PinnedRow({ pinned }: { readonly pinned: PinnedMemory }): ReactElement {
  return (
    <li
      data-testid={`pinned-${pinned.id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-1)',
        padding: 'var(--space-2) var(--space-3)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-surface)',
      }}
    >
      <span style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
        <span style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-sm)' }}>
          {pinned.title}
        </span>
        <Pill intent="muted" title={`Pinned from ${pinned.kind}`}>
          {pinned.kind}
        </Pill>
      </span>
      <span style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-sm)' }}>
        {pinned.body}
      </span>
    </li>
  );
}

function RecapList({ turns }: { readonly turns: ReadonlyArray<RecapTurn> }): ReactElement {
  return (
    <ul aria-label="Recap turns" style={listStyle}>
      {turns.map((turn) => (
        <li key={turn.turn_id} style={turnRowStyle}>
          <Pill intent="muted" title={`Sequence #${turn.sequence_number}`}>
            #{turn.sequence_number}
          </Pill>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>
              <Typewriter
                text={turn.headline}
                ariaLabel={`Recap turn ${turn.sequence_number} headline`}
              />
            </span>
            <span style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-xs)' }}>
              {formatHappenedAt(turn.happened_at)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

interface RecapTabProps {
  readonly recapTurns: ReadonlyArray<RecapTurn> | undefined;
  readonly generatedAt: string | undefined;
  readonly isLoading: boolean;
  readonly error: { readonly message: string; readonly status?: number } | null;
}

function RecapTab({ recapTurns, generatedAt, isLoading, error }: RecapTabProps): ReactElement {
  if (isLoading) {
    return <LoadingPanel label="Loading recap" intent="inline" />;
  }
  // 404 specifically is the "Coming in Stage 5" path; everything else
  // is a real network error.
  const isComingSoon = error && error.status === 404;
  if (isComingSoon) {
    return (
      <EmptyState
        title="Recap arrives in Stage 5"
        description={`(${error?.message ?? 'not implemented'}) The memory extractor that summarises recent beats is the Stage 5 deliverable.`}
      />
    );
  }
  if (error) {
    return (
      <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>
        Couldn’t load recap: {error.message}
      </p>
    );
  }
  if (!recapTurns || recapTurns.length === 0) {
    return (
      <EmptyState
        title="No recap yet"
        description="The LLM has not produced a chronicle for this branch. Memory extraction rolls out in Stage 5.3."
      />
    );
  }
  return (
    <>
      {generatedAt && (
        <p style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>
          Last refreshed {formatHappenedAt(generatedAt)}
        </p>
      )}
      <RecapList turns={recapTurns} />
    </>
  );
}

interface LoreTabProps {
  readonly entries: ReadonlyArray<LoreEntry> | undefined;
  readonly isLoading: boolean;
  readonly error: { readonly message: string; readonly status?: number } | null;
  readonly onSearch: (query: string) => void;
  readonly searchValue: string;
}

function LoreTab({ entries, isLoading, error, onSearch, searchValue }: LoreTabProps): ReactElement {
  const onInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => onSearch(event.target.value),
    [onSearch],
  );
  if (isLoading) {
    return <LoadingPanel label="Loading lore" intent="inline" />;
  }
  const isComingSoon = error && error.status === 404;
  if (isComingSoon) {
    return (
      <EmptyState
        title="Lore arrives in Stage 5"
        description={`(${error?.message ?? 'not implemented'}) Canonical facts the LLM remembers will surface here once the lore extractor ships.`}
      />
    );
  }
  if (error) {
    return (
      <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>
        Couldn’t load lore: {error.message}
      </p>
    );
  }
  return (
    <>
      <div style={searchRowStyle}>
        <label htmlFor="memory-lore-search" style={{ fontSize: 'var(--text-sm)' }}>
          Search
        </label>
        <input
          id="memory-lore-search"
          type="search"
          placeholder="Search by key, title, or tag…"
          value={searchValue}
          onChange={onInput}
          style={searchInputStyle}
          data-testid="memory-lore-search"
        />
      </div>
      {entries && entries.length > 0 ? (
        <ul aria-label="Lore entries" style={listStyle}>
          {entries.map((entry) => (
            <li key={entry.key}>
              <LoreCard entry={entry} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No matching lore"
          description="Nothing in the lore list matches that search yet. Try clearing the filter or check back when the scenario publishes more canon facts."
        />
      )}
    </>
  );
}

interface PinnedTabProps {
  readonly pinned: ReadonlyArray<PinnedMemory> | undefined;
  readonly isLoading: boolean;
  readonly error: { readonly message: string; readonly status?: number } | null;
}

function PinnedTab({ pinned, isLoading, error }: PinnedTabProps): ReactElement {
  if (isLoading) {
    return <LoadingPanel label="Loading pinned memories" intent="inline" />;
  }
  if (error) {
    return (
      <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>
        Couldn’t load pinned memories: {error.message}
      </p>
    );
  }
  if (!pinned || pinned.length === 0) {
    return (
      <EmptyState
        title="No pinned memories yet"
        description="Star beats from the recap or lore tabs to keep them close at hand. Pinning ships in Stage 5.2."
      />
    );
  }
  return (
    <ul aria-label="Pinned memories" style={listStyle}>
      {pinned.map((entry) => (
        <PinnedRow key={entry.id} pinned={entry} />
      ))}
    </ul>
  );
}

export function MemoryPanel({
  adventureId,
  defaultTab = 'recap',
  title = 'Memory',
}: MemoryPanelProps): ReactElement {
  const [tab, setTab] = useState<MemoryTab>(defaultTab);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 200);

  // Reset the search box when the adventure changes so the lore tab
  // doesn't carry stale queries across branches.
  const lastAdventureRef = useRef(adventureId);
  useEffect(() => {
    if (lastAdventureRef.current !== adventureId) {
      lastAdventureRef.current = adventureId;
      setSearchInput('');
    }
  }, [adventureId]);

  const recapQuery = useMemoryRecap(adventureId);
  const { query: loreQuery } = useMemoryLore(adventureId);
  const pinnedQuery = useMemoryPinned(adventureId);

  const filteredLore = useMemo(() => {
    const list = loreQuery.data?.entries;
    if (!list) return list;
    const q = debouncedSearch.trim().toLowerCase();
    if (q.length === 0) return list;
    return list.filter((entry) => {
      if (entry.key.toLowerCase().includes(q)) return true;
      if (entry.title.toLowerCase().includes(q)) return true;
      if (entry.tags.some((tag) => tag.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [loreQuery.data, debouncedSearch]);

  // Some hooks (older query versions) return `unknown` from `.data`;
  // normalise to a typed array before passing to children.
  const loreEntries: ReadonlyArray<LoreEntry> | undefined = filteredLore?.filter(isLoreEntry);

  return (
    <Card
      title={title}
      subtitle={
        <span style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <Pill intent="muted" title="Adventure id">
            #{adventureId}
          </Pill>
          <Pill intent="info" title={`Current tab: ${tab}`}>
            {tab}
          </Pill>
        </span>
      }
    >
      <ErrorBoundary>
        <div role="tablist" aria-label="Memory tabs" style={tabRowStyle}>
          {TABS.map((entry) => {
            const active = entry.id === tab;
            return (
              <button
                key={entry.id}
                role="tab"
                type="button"
                aria-selected={active}
                aria-controls={`memory-tab-panel-${entry.id}`}
                id={`memory-tab-${entry.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setTab(entry.id)}
                style={active ? tabButtonActiveStyle : tabButtonInactiveStyle}
                data-testid={`memory-tab-${entry.id}`}
              >
                {entry.label}
              </button>
            );
          })}
        </div>
        <div
          role="tabpanel"
          id={`memory-tab-panel-${tab}`}
          aria-labelledby={`memory-tab-${tab}`}
          style={{ marginTop: 'var(--space-3)' }}
        >
          {tab === 'recap' && (
            <RecapTab
              recapTurns={recapQuery.data?.turns}
              generatedAt={recapQuery.data?.generated_at}
              isLoading={recapQuery.isLoading}
              error={
                recapQuery.error
                  ? {
                      message: recapQuery.error.message,
                      status:
                        recapQuery.error instanceof ApiError
                          ? recapQuery.error.status
                          : undefined,
                    }
                  : null
              }
            />
          )}
          {tab === 'lore' && (
            <LoreTab
              entries={loreEntries}
              isLoading={loreQuery.isLoading}
              error={
                loreQuery.error
                  ? {
                      message: loreQuery.error.message,
                      status:
                        loreQuery.error instanceof ApiError
                          ? loreQuery.error.status
                          : undefined,
                    }
                  : null
              }
              searchValue={searchInput}
              onSearch={setSearchInput}
            />
          )}
          {tab === 'pinned' && (
            <PinnedTab
              pinned={pinnedQuery.data?.pinned}
              isLoading={pinnedQuery.isLoading}
              error={
                pinnedQuery.error
                  ? { message: pinnedQuery.error.message }
                  : null
              }
            />
          )}
        </div>
        <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
          <Button
            intent="ghost"
            size="sm"
            onClick={() => {
              void recapQuery.refetch();
              void loreQuery.refetch();
              void pinnedQuery.refetch();
            }}
          >
            Refresh
          </Button>
        </div>
      </ErrorBoundary>
    </Card>
  );
}