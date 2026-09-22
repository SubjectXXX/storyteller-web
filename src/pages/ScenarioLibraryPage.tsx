import type { CSSProperties, ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { PageHeader } from '@/ui/PageHeader';
import { Pill, type PillIntent } from '@/ui/Pill';
import { SCENARIO_FIXTURES, type ScenarioFixture, type ScenarioMood, type ScenarioRating } from '@/fixtures/data';

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

  const filtered = useMemo(() => {
    return SCENARIO_FIXTURES.filter((s) => {
      if (rating !== 'all' && s.rating !== rating) return false;
      if (!filter) return true;
      const needle = filter.toLowerCase();
      return (
        s.title.toLowerCase().includes(needle) ||
        s.author.toLowerCase().includes(needle) ||
        s.synopsis.toLowerCase().includes(needle)
      );
    });
  }, [filter, rating]);

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

      {filtered.length === 0 ? (
        <p
          style={{
            padding: 'var(--space-6)',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
            color: 'var(--color-foreground-muted)',
          }}
        >
          No scenarios match \u201c{filter}\u201d. Try a different keyword or rating.
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
                {scenario.chapters} chapters \u00b7 {scenario.durationMinutes} min
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
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-3)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
};
