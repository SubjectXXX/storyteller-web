import type { ReactElement } from "react";
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

interface ScenarioFixture {
  id: string;
  title: string;
  author: string;
  rating: 'all-ages' | 'mature' | 'restricted';
  synopsis: string;
  coverColor: string;
}

const SCENARIO_FIXTURES: ReadonlyArray<ScenarioFixture> = [
  {
    id: 'demo-romance',
    title: 'A Quiet Court',
    author: 'Mira Tan',
    rating: 'mature',
    synopsis: 'Negotiate courtly intrigue in a city of stained glass and secrets.',
    coverColor: 'var(--color-storyline-romance)',
  },
  {
    id: 'demo-mystery',
    title: 'The Cartographer\u2019s Last Letter',
    author: 'Sasha Onyebuchi',
    rating: 'all-ages',
    synopsis: 'Decode a vanished explorer\u2019s field notes before the next storm.',
    coverColor: 'var(--color-storyline-mystery)',
  },
  {
    id: 'demo-horizon',
    title: 'Beyond the Reef',
    author: 'Imani Reeve',
    rating: 'all-ages',
    synopsis: 'Pilot a windjammer through the Storm Lanes and broker peace at sea.',
    coverColor: 'var(--color-storyline-hope)',
  },
];

export default function ScenarioLibraryPage(): ReactElement {
  const [filter, setFilter] = useState('');
  const [rating, setRating] = useState<'all' | ScenarioFixture['rating']>('all');

  // Pure UI state — nothing is fetched yet. Stage S2 wires the real
  // `/v1/scenarios` endpoint through @tanstack/react-query.
  const filtered = SCENARIO_FIXTURES.filter((s) => {
    if (rating !== 'all' && s.rating !== rating) return false;
    if (! filter) return true;
    return s.title.toLowerCase().includes(filter.toLowerCase());
  });

  return (
    <section aria-labelledby="scenarios">
      <header style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <h1 id="scenarios" style={{ fontSize: 'var(--text-2xl)' }}>
          Scenario library
        </h1>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <label>
            <span className="sr-only">Filter</span>
            <input
              type="search"
              placeholder="Filter scenarios"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              style={inputStyle}
            />
          </label>
          <label>
            <span className="sr-only">Rating</span>
            <select value={rating} onChange={(event) => setRating(event.target.value as typeof rating)} style={inputStyle}>
              <option value="all">All ratings</option>
              <option value="all-ages">All ages</option>
              <option value="mature">Mature</option>
              <option value="restricted">Restricted</option>
            </select>
          </label>
        </div>
      </header>

      <ul
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        {filtered.map((scenario) => (
          <li key={scenario.id} style={cardStyle}>
            <div
              aria-hidden
              style={{
                height: 120,
                borderRadius: 'var(--radius-md)',
                background: scenario.coverColor,
              }}
            />
            <h2 style={{ fontSize: 'var(--text-lg)', margin: 'var(--space-3) 0 var(--space-1)' }}>
              {scenario.title}
            </h2>
            <p style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-sm)' }}>{scenario.author}</p>
            <p style={{ marginTop: 'var(--space-2)' }}>{scenario.synopsis}</p>
            <p
              style={{
                marginTop: 'var(--space-2)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-foreground-subtle)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {scenario.rating.replace('-', ' ')}
            </p>
            <Link
              to={`/play/${scenario.id}`}
              style={{
                marginTop: 'var(--space-3)',
                display: 'inline-flex',
                padding: 'var(--space-2) var(--space-3)',
                border: '1px solid var(--color-primary)',
                color: 'var(--color-primary)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              Start run
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-3)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
  minWidth: 200,
};

const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-3)',
  display: 'flex',
  flexDirection: 'column',
};

void useEffect; // silence unused-import warning until a fetch arrives in S2
