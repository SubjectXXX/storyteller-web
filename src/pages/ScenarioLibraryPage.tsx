import type { CSSProperties, ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { PageHeader } from '@/ui/PageHeader';
import { Pill, type PillIntent } from '@/ui/Pill';
import { LoadingPanel } from '@/components/LoadingPanel';
import { useScenarios } from '@/hooks';
import {
  SCENARIO_FIXTURES,
  type ScenarioFixture,
  type ScenarioMood,
  type ScenarioRating,
} from '@/fixtures/data';
import { ApiError } from '@/api-client';

const RATING_LABEL: Record<ScenarioRating, string> = {
  'all-ages': 'All ages',
  mature: 'Mature',
  restricted: 'Restricted',
};

const MOOD_LABEL: Record<ScenarioMood, string> = {
  romance: 'Romance',
  mystery: 'Mystery',
  hope: 'Hope',
  conflict: 'Conflict',
};

const RATING_PILL: Record<ScenarioRating, PillIntent> = {
  'all-ages': 'success',
  mature: 'warning',
  restricted: 'danger',
};

export default function ScenarioLibraryPage(): ReactElement {
  const [filter, setFilter] = useState('');
  const [rating, setRating] = useState<'all' | ScenarioRating>('all');

  // The hook fetches via `/api/scenarios` and the api-client wraps a fixture
  // fallback so the page still renders offline (S2-T01 will own the contract).
  const queryParams = useMemo(() => {
    const params: { rating?: ScenarioRating; q?: string } = {};
    if (rating !== 'all') params.rating = rating;
    if (filter.trim().length > 0) params.q = filter.trim();
    return params;
  }, [rating, filter]);

  const { data, isLoading, error, refetch } = useScenarios(queryParams);

  // Fixture fallback path: when the API is unreachable the fetcher returns
  // the S1 fixture list. We still apply local filtering on the client so the
  // UX matches what `/api/scenarios?rating=...&q=...` would do server-side.
  const source: ReadonlyArray<ScenarioFixture> = data ?? SCENARIO_FIXTURES;
  const filtered = useMemo(() => {
    return source.filter((s) => {
      if (rating !== 'all' && s.rating !== rating) return false;
      if (!filter) return true;
      const needle = filter.toLowerCase();
      return (
        s.title.toLowerCase().includes(needle) ||
        s.author.toLowerCase().includes(needle) ||
        s.synopsis.toLowerCase().includes(needle)
      );
    });
  }, [source, filter, rating]);

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
            {(Object.keys(RATING_LABEL) as ScenarioRating[]).map((r) => (
              <option key={r} value={r}>
                {RATING_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? (
        <LoadingPanel label="Loading scenarios" intent="inline" />
      ) : error && !data ? (
        // Render the offline banner but keep the fixture fallback list visible
        // so the player can still pick a scenario. The error banner makes the
        // degraded state obvious to the developer without blocking the UX.
        <div data-testid="library-error" role="status" aria-live="polite" style={{ marginBottom: 'var(--space-3)' }}>
          <ApiErrorBanner error={error} onRetry={() => void refetch()} />
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
            <li key={scenario.id} id={scenario.id} style={cardStyle}>
              <ScenarioCover scenario={scenario} />
              <h2 style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-serif)' }}>{scenario.title}</h2>
              <p style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-sm)', margin: 0 }}>
                by {scenario.author}
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-foreground-subtle)', margin: 0 }}>
                {scenario.chapters} chapters · {scenario.durationMinutes} min
              </p>
              <p className="prose" style={{ margin: 0 }}>{scenario.synopsis}</p>
              <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                <Pill intent={RATING_PILL[scenario.rating]} title={`Rating: ${RATING_LABEL[scenario.rating]}`}>
                  {RATING_LABEL[scenario.rating]}
                </Pill>
                {scenario.moods.map((m) => (
                  <Pill key={m} intent="muted" title={`Mood: ${MOOD_LABEL[m]}`}>
                    {MOOD_LABEL[m]}
                  </Pill>
                ))}
              </div>
              <Link to={`/play/${scenario.id}`} style={{ marginTop: 'auto' }}>
                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    background: 'var(--color-primary)',
                    color: 'var(--color-primary-foreground)',
                    border: '1px solid var(--color-primary)',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 'var(--weight-medium)',
                    cursor: 'pointer',
                    minHeight: 'var(--control-touch-min)',
                  }}
                >
                  Start run
                </button>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ScenarioCover({ scenario }: { scenario: ScenarioFixture }): ReactElement {
  return (
    <div
      aria-hidden
      style={{
        height: 132,
        borderRadius: 'var(--radius-md)',
        background: scenario.coverAccent,
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
