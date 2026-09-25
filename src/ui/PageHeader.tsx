import type { CSSProperties, ReactElement, ReactNode } from 'react';

export interface PageHeaderProps {
  readonly eyebrow?: ReactNode;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps): ReactElement {
  const wrap: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    marginBottom: 'var(--space-6)',
    paddingBottom: 'var(--space-4)',
  };
  const row: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 'var(--space-4)',
    flexWrap: 'wrap',
  };
  const eyebrowStyle: CSSProperties = {
    fontSize: 'var(--text-xs)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--color-foreground-subtle)',
    fontFamily: 'var(--font-sans)',
  };
  const titleStyle: CSSProperties = {
    fontFamily: 'var(--font-serif)',
    fontSize: 'var(--text-3xl)',
    fontWeight: 'var(--weight-semibold)',
    lineHeight: 'var(--leading-tight)',
    margin: 0,
  };
  const descStyle: CSSProperties = {
    color: 'var(--color-foreground-muted)',
    maxWidth: '60ch',
    fontSize: 'var(--text-md)',
  };
  return (
    <header style={wrap}>
      {eyebrow && <div style={eyebrowStyle}>{eyebrow}</div>}
      <div style={row}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <h1 style={titleStyle}>{title}</h1>
          {description && <p style={descStyle}>{description}</p>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 'var(--space-2)' }}>{actions}</div>}
      </div>
    </header>
  );
}
