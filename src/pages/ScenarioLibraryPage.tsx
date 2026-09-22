import type { CSSProperties, ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { PageHeader } from '@/ui/PageHeader';
import { Button } from '@/ui/Button';
import { LoadingPanel } from '@/components/LoadingPanel';
import { useScenarios } from '@/hooks';
import { useStartAdventure } from '@/hooks/useAdventures';
import {
  ApiError,
  type ScenarioDetailResponse,
  type ScenarioListResponse,
} from '@/api-client';
import {
  SCENARIO_RESOURCE_FIXTURES,
  type ScenarioResource,
} from '@/fixtures/data';

export default function ScenarioLibraryPage(): ReactElement {
  const [filter, setFilter] = useState('');
  const [rating, setRating] = useState<'all' | 'all-ages' | 'mature' | 'restricted'>('all');
  const navigate = useNavigate();
  const startAdventure = useStartAdventure();
  const [startingSlug, setStartingSlug] = useState<string | null>(null);
  const [errorSlug, setErrorSlug] = useState<string | null>(null);

  const queryParams = useMemo(() => {
    const params: { rating?: 'all-ages' | 'mature' | 'restricted'; q?: string } = {};
    if (rating !== 'all') params.rating = rating;
    if (filter.trim().length > 0) params.q = filter.trim();
    return params;
  }, [rating, filter]);

  const { data, isLoading, error, refetch } = useScenarios(queryParams);

  // Fixture fallback path: when the API is unreachable the fetcher returns
  // the S1 fixture list (mapped to ScenarioResource in openapi.ts). Apply
  // local filtering for the offline fallback UX so the player still finds
  // what they searched for.
  const source: ReadonlyArray<ScenarioResource> = data ?? SCENARIO_RESOURCE_FIXTURES;
  const filtered = useMemo(() => {
    return source.filter((s) => {
      if (rating !== 'all') {
        if (rating === 'all-ages' && s.tags.includes('mature')) return false;
        if (rating === 'mature' && !s.tags.includes('mature') && !s.tags.includes('conflict')) return false;
        if (rating === 'restricted' && !s.tags.includes('conflict')) return false;
      }
      if (!filter) return true;
      const needle = filter.toLowerCase();
      return (
        s.title.toLowerCase().includes(needle) ||
        s.blurb.toLowerCase().includes(needle) ||
        s.tags.some((t) => t.toLowerCase().includes(needle))
      );
    });
  }, [source, filter, rating]);

  const handleStart = async (slug: string) => {
    setErrorSlug(null);
    setStartingSlug(slug);
    try {
      const adventure = await startAdventure.mutateAsync({ scenario_slug: slug });
      navigate(`/adventures/${adventure.id}`);
    } catch (err) {
      setErrorSlug(slug);
      setStartingSlug(null);
      // eslint-disable-next-line no-console -- intentional dev signal
      console.warn('[storyteller/web] start adventure failed', err);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Library"
        title="Choose a story"
        description="Each scenario seeds a deterministic narrative graph you walk through with the composer. Real ratings come from the moderation pipeline (S5)."
      />

      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
        <label style={fieldStyle}>
          <span className="sr-only">Filter</span>
          <input
            type="search"
            placeholder="Filter scenarios"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={fieldStyle}>
          <span className="sr-only">Rating</span>
          <select
            value={rating}
            onChange={(event) => setRating(event.target.value as typeof rating)}
            style={inputStyle}
          >
            <option value="all">All ratings</option>
            <option value="all-ages">All ages</option>
            <option value="mature">Mature</option>
            <option value="restricted">Restricted</option>
          </select>
        </label>
      </div>

      {isLoading ? (
        <LoadingPanel label="Loading scenarios" intent="inline" />
      ) : error && !data ? (
        <div data-testid="library-error" role="status" aria-live="polite" style={{ marginBottom: 'var(--space-3)' }}>
          <ApiErrorBanner error={error as ApiError} onRetry={() => void refetch()} />
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <p
          style={{
            padding: 'var(--space-6)',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
            color: 'var(--color-foreground-muted)',
          }}
        >
          No scenarios match “{filter}”. Try a different keyword or rating.
        </p>
      ) : (
        <ul
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 'var(--space-4)',
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}
        >
          {filtered.map((scenario) => (
            <li key={scenario.slug} id={scenario.slug} style={cardStyle}>
              <ScenarioCover slug={scenario.slug} />
              <h2 style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-serif)' }}>
                {scenario.title}
              </h2>
              <p
                style={{
                  color: 'var(--color-foreground-muted)',
                  fontSize: 'var(--text-sm)',
                  margin: 0,
                }}
              >
                v{scenario.latest_version}
                {scenario.length_estimate_minutes
                  ? ` · ${scenario.length_estimate_minutes} min`
                  : ''}
              </p>
              <p className="prose" style={{ margin: 0 }}>{scenario.blurb}</p>
              <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                {scenario.tags.map((tag) => (
                  <span
                    key={tag}
                    title={`Tag: ${tag}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 'var(--space-1)',
                      padding: '2px var(--space-2)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--weight-medium)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface-muted)',
                      color: 'var(--color-foreground-muted)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              {errorSlug === scenario.slug && (
                <p role="alert" style={errorStyle}>
                  Could not start this adventure. Sign in or try again.
                </p>
              )}
              <div style={{ marginTop: 'auto' }}>
                <Button
                  intent="primary"
                  onClick={() => void handleStart(scenario.slug)}
                  disabled={startingSlug === scenario.slug}
                  aria-label={`Start adventure on ${scenario.title}`}
                  fullWidth
                >
                  {startingSlug === scenario.slug ? 'Starting…' : 'Start adventure'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ScenarioCover({ slug }: { slug: string }): ReactElement {
  return (
    <div
      aria-hidden
      data-testid={`scenario-cover-${slug}`}
      style={{
        height: 132,
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-storyline-mystery)',
        marginBottom: 'var(--space-2)',
      }}
    />
  );
}

function ApiErrorBanner({ error, onRetry }: { error: ApiError; onRetry: () => void }): ReactElement {
  return (
    <p
      style={{
        padding: 'var(--space-3) var(--space-4)',
        border: '1px solid var(--color-warning)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-surface-muted)',
        color: 'var(--color-foreground)',
        fontSize: 'var(--text-sm)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 'var(--space-3)',
      }}
    >
      <span>
        Could not reach the API ({error.status === 0 ? 'offline' : error.status}). Showing local fixtures.
      </span>
      <button
        type="button"
        onClick={onRetry}
        style={{
          padding: 'var(--space-1) var(--space-3)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface)',
          cursor: 'pointer',
        }}
      >
        Retry
      </button>
    </p>
  );
}

const fieldStyle: CSSProperties = { display: 'inline-flex', flexDirection: 'column' };
const inputStyle: CSSProperties = {
  padding: 'var(--space-2) var(--space-3)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
  color: 'var(--color-foreground)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-base)',
  minWidth: 200,
  minHeight: 'var(--control-touch-min)',
};
const cardStyle: CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-3)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
};
const errorStyle: CSSProperties = {
  padding: 'var(--space-2) var(--space-3)',
  border: '1px solid var(--color-danger)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-muted)',
  color: 'var(--color-danger)',
  fontSize: 'var(--text-xs)',
  margin: 0,
};

// Re-export the type aliases that other modules may need for typing fixtures.
export type { ScenarioDetailResponse, ScenarioListResponse };
