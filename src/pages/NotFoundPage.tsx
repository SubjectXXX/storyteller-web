import type { ReactElement } from "react";
import { Link } from 'react-router';

export default function NotFoundPage(): ReactElement {
  return (
    <section
      aria-labelledby="not-found"
      style={{
        textAlign: 'center',
        padding: 'var(--space-12)',
        color: 'var(--color-foreground-muted)',
      }}
    >
      <h1 id="not-found" style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-3)' }}>
        404 — page not found
      </h1>
      <p>The route you tried does not exist in this build.</p>
      <Link
        to="/"
        style={{
          marginTop: 'var(--space-4)',
          display: 'inline-flex',
          padding: 'var(--space-2) var(--space-4)',
          background: 'var(--color-primary)',
          color: 'var(--color-primary-foreground)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        Return home
      </Link>
    </section>
  );
}
