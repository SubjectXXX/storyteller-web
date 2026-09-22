import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { TopNav } from '@/components/TopNav';

interface PageShellProps {
  readonly children: ReactNode;
}

/**
 * Standard page frame: top nav, content area, footer. Consumed by every
 * authenticated and fixture page. Skipped on the loading and not-found
 * panels so the design tokens alone can carry the screen.
 */
export function PageShell({ children }: PageShellProps): ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <TopNav />
      <main
        id="main"
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 1200,
          margin: '0 auto',
          padding: 'var(--space-6) var(--space-4)',
        }}
      >
        {children}
      </main>
      <footer
        style={{
          padding: 'var(--space-4)',
          color: 'var(--color-foreground-subtle)',
          textAlign: 'center',
          fontSize: 'var(--text-xs)',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        Storyteller \u00b7 Lantern &amp; Ink \u00b7 Stage S1 fixture shell
      </footer>
    </div>
  );
}

void {} as CSSProperties;
