import type { ReactElement } from "react";
import { Link } from 'react-router';

export default function HomePage(): ReactElement {
  return (
    <section aria-labelledby="welcome">
      <h1 id="welcome" style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-4)' }}>
        Welcome, traveler
      </h1>
      <p style={{ color: 'var(--color-foreground-muted)', maxWidth: 560 }}>
        This is the Stage S0 fixture. Pick a scenario to read through its
        synopsis, or jump straight into play to see the surfaces we'll fill
        out in S1.
      </p>
      <ul style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)', flexWrap: 'wrap' }}>
        <li>
          <Link
            to="/scenarios"
            style={{
              display: 'inline-flex',
              padding: 'var(--space-2) var(--space-4)',
              background: 'var(--color-primary)',
              color: 'var(--color-primary-foreground)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            Browse scenarios
          </Link>
        </li>
        <li>
          <Link
            to="/play"
            style={{
              display: 'inline-flex',
              padding: 'var(--space-2) var(--space-4)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            Open play surface
          </Link>
        </li>
      </ul>
    </section>
  );
}
