import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';
import { TopNav } from '@/components/TopNav';

interface PageShellProps {
  readonly children: ReactNode;
  /**
   * `default` is the scrolling document layout every route has used so
   * far (centred `maxWidth: 1200` column + footer).
   *
   * `hud` is opt-in and used only by the desktop player view: it drops
   * the footer and the width cap, pins the frame to the viewport
   * (`100dvh` + `overflow: hidden`) and lets `main` own the vertical
   * space so a page can lay out its own non-scrolling chrome.
   */
  readonly layout?: 'default' | 'hud';
}

/**
 * Standard page frame: top nav, content area, footer. Consumed by every
 * authenticated and fixture page. Skipped on the loading and not-found
 * panels so the design tokens alone can carry the screen.
 */
export function PageShell({ children, layout = 'default' }: PageShellProps): ReactElement {
  const isHud = layout === 'hud';

  // In HUD mode the document itself must never scroll — only the story
  // column and the context rail do. The shell is `100dvh` + `overflow:
  // hidden`, but `body` can still grow when a child overflows, so pin
  // the html/body-level containers too and restore on unmount.
  useEffect(() => {
    if (!isHud) return undefined;
    const { body, documentElement } = document;
    const prevBody = body.style.overflow;
    const prevHtml = documentElement.style.overflow;
    const prevHeight = documentElement.style.height;
    body.style.overflow = 'hidden';
    documentElement.style.overflow = 'hidden';
    documentElement.style.height = '100%';
    return () => {
      body.style.overflow = prevBody;
      documentElement.style.overflow = prevHtml;
      documentElement.style.height = prevHeight;
    };
  }, [isHud]);

  if (isHud) {
    return (
      <div
        data-testid="page-shell-hud"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100dvh',
          maxHeight: '100dvh',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <TopNav variant="hud" />
        <main
          id="main"
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            overflow: 'hidden',
          }}
        >
          {children}
        </main>
      </div>
    );
  }

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
        Storyteller · Lantern &amp; Ink
      </footer>
    </div>
  );
}
