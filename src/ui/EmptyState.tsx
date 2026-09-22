import type { CSSProperties, ReactElement, ReactNode } from 'react';

export interface EmptyStateProps {
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly action?: ReactNode;
  readonly icon?: ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps): ReactElement {
  // Round-8 per Stitch roundness (DESIGN.md §Geometry). Matches Card so empty
  // placeholders don't read as a different elevation family than populated cards.
  const wrap: CSSProperties = {
    border: '1px dashed var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-8)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-3)',
    textAlign: 'center',
    background: 'var(--color-surface)',
  };
  const titleStyle: CSSProperties = {
    fontFamily: 'var(--font-serif)',
    fontSize: 'var(--text-lg)',
    fontWeight: 'var(--weight-semibold)',
  };
  const descStyle: CSSProperties = {
    color: 'var(--color-foreground-muted)',
    fontSize: 'var(--text-sm)',
    maxWidth: '40ch',
  };
  return (
    <div role="status" style={wrap}>
      {icon && <div style={{ color: 'var(--color-primary)' }}>{icon}</div>}
      <h3 style={titleStyle}>{title}</h3>
      {description && <p style={descStyle}>{description}</p>}
      {action}
    </div>
  );
}
