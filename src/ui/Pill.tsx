import type { CSSProperties, ReactElement, ReactNode } from 'react';

export type PillIntent = 'neutral' | 'muted' | 'success' | 'warning' | 'danger' | 'info';

export interface PillProps {
  readonly children: ReactNode;
  readonly intent?: PillIntent;
  readonly title?: string;
}

const intentStyles: Record<PillIntent, CSSProperties> = {
  neutral: {
    background: 'var(--color-surface-muted)',
    color: 'var(--color-foreground)',
    borderColor: 'var(--color-border)',
  },
  muted: {
    background: 'var(--color-surface)',
    color: 'var(--color-foreground-muted)',
    borderColor: 'var(--color-border)',
  },
  success: {
    background: 'var(--color-success)',
    color: 'var(--color-success-foreground)',
    borderColor: 'var(--color-success)',
  },
  warning: {
    background: 'var(--color-warning)',
    color: 'var(--color-warning-foreground)',
    borderColor: 'var(--color-warning)',
  },
  danger: {
    background: 'var(--color-danger)',
    color: 'var(--color-danger-foreground)',
    borderColor: 'var(--color-danger)',
  },
  info: {
    background: 'var(--color-info)',
    color: 'var(--color-info-foreground)',
    borderColor: 'var(--color-info)',
  },
};

export function Pill({ children, intent = 'neutral', title }: PillProps): ReactElement {
  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    // A column flex container defaults to `align-items: stretch`, so the
    // cross axis is horizontal and this badge was stretched to the full
    // width of its parent card. `width: 'fit-content'` only constrains the
    // horizontal axis, so it stays a no-op in normal inline flow and inside
    // row flex containers (where the cross axis is vertical and
    // `alignItems: 'center'` still centers the badge).
    width: 'fit-content',
    gap: 'var(--space-1)',
    padding: '2px var(--space-2)',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-medium)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderRadius: 'var(--radius-full)',
    borderWidth: 1,
    borderStyle: 'solid',
    lineHeight: 1.6,
    ...intentStyles[intent],
  };
  return (
    <span style={style} title={title}>
      {children}
    </span>
  );
}
