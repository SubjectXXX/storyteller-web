import type { CSSProperties, ReactElement, ReactNode } from 'react';

export interface CardProps {
  readonly children: ReactNode;
  readonly title?: ReactNode;
  readonly subtitle?: ReactNode;
  readonly footer?: ReactNode;
  readonly tone?: 'default' | 'muted' | 'elevated';
  readonly padding?: 'sm' | 'md' | 'lg';
}

const toneStyles: Record<NonNullable<CardProps['tone']>, CSSProperties> = {
  default: { background: 'var(--color-surface)', borderColor: 'var(--color-border)' },
  muted:   { background: 'var(--color-surface-muted)', borderColor: 'var(--color-border)' },
  elevated: { background: 'var(--color-surface-elevated)', borderColor: 'var(--color-border)' },
};

const paddingStyles: Record<NonNullable<CardProps['padding']>, string> = {
  sm: 'var(--space-2) var(--space-3)',
  md: 'var(--space-3) var(--space-4)',
  lg: 'var(--space-4) var(--space-6)',
};

export function Card({
  children,
  title,
  subtitle,
  footer,
  tone = 'default',
  padding = 'md',
}: CardProps): ReactElement {
  const containerStyle: CSSProperties = {
    ...toneStyles[tone],
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 'var(--radius-lg)',
    padding: paddingStyles[padding],
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
  };

  const footerStyle: CSSProperties = {
    borderTop: '1px solid var(--color-border)',
    paddingTop: 'var(--space-3)',
    marginTop: 'var(--space-2)',
  };

  return (
    <article style={containerStyle}>
      {(title || subtitle) && (
        <header style={headerStyle}>
          {title && <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)' }}>{title}</h3>}
          {subtitle && <p style={{ color: 'var(--color-foreground-muted)', fontSize: 'var(--text-sm)' }}>{subtitle}</p>}
        </header>
      )}
      <div>{children}</div>
      {footer && <footer style={footerStyle}>{footer}</footer>}
    </article>
  );
}
