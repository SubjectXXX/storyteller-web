import type { CSSProperties, ReactElement } from 'react';

type LoadingPanelIntent = 'page' | 'inline';

interface LoadingPanelProps {
  label?: string;
  intent?: LoadingPanelIntent;
}

// Base style + per-intent overrides. Inline styles so the layout works
// without depending on Tailwind utility classes (the player SPA ships
// only design tokens + reset; components style themselves with
// `style` objects referencing CSS variables).
const baseStyle: CSSProperties = {
  display: 'flex',
  width: '100%',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-2)',
  textAlign: 'center',
};

const intentStyles: Record<LoadingPanelIntent, CSSProperties> = {
  page: { minHeight: '40vh', padding: 'var(--space-8)' },
  inline: { minHeight: '40vh', padding: 'var(--space-4)' },
};

export function LoadingPanel({
  label = 'Loading',
  intent = 'page',
}: LoadingPanelProps): ReactElement {
  return (
    <div
      role="status"
      aria-live="polite"
      data-loading-state="loading"
      style={{ ...baseStyle, ...intentStyles[intent] }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '3px solid var(--color-surface-muted)',
          borderTopColor: 'var(--color-primary)',
          animation: 'spin 0.9s linear infinite',
        }}
      />
      <p style={{ color: 'var(--color-foreground-muted)' }}>{label}…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}