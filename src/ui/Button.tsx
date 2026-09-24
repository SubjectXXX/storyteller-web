import type { CSSProperties, ReactElement, ReactNode } from 'react';

export type ButtonIntent = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  readonly children: ReactNode;
  readonly intent?: ButtonIntent;
  readonly size?: ButtonSize;
  readonly type?: 'button' | 'submit' | 'reset';
  readonly disabled?: boolean;
  readonly onClick?: () => void;
  readonly fullWidth?: boolean;
  readonly 'aria-label'?: string;
  readonly 'data-testid'?: string;
}

const baseStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-2)',
  borderRadius: 'var(--radius-md)',
  fontFamily: 'var(--font-sans)',
  fontWeight: 'var(--weight-medium)',
  cursor: 'pointer',
  border: '1px solid transparent',
  textDecoration: 'none',
  minHeight: 'var(--control-touch-min)',
  whiteSpace: 'nowrap',
};

const sizeStyles: Record<ButtonSize, CSSProperties> = {
  sm: { padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--text-sm)' },
  md: { padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-base)' },
  lg: { padding: 'var(--space-3) var(--space-5)', fontSize: 'var(--text-lg)' },
};

const intentStyles: Record<ButtonIntent, CSSProperties> = {
  primary: {
    background: 'var(--color-primary)',
    color: 'var(--color-primary-foreground)',
    borderColor: 'var(--color-primary)',
  },
  secondary: {
    background: 'var(--color-surface-muted)',
    color: 'var(--color-foreground)',
    borderColor: 'var(--color-border)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-primary)',
    borderColor: 'transparent',
  },
  danger: {
    background: 'var(--color-danger)',
    color: 'var(--color-danger-foreground)',
    borderColor: 'var(--color-danger)',
  },
};

export function Button({
  children,
  intent = 'primary',
  size = 'md',
  type = 'button',
  disabled,
  onClick,
  fullWidth,
  ...rest
}: ButtonProps): ReactElement {
  const style: CSSProperties = {
    ...baseStyle,
    ...sizeStyles[size],
    ...intentStyles[intent],
    ...(fullWidth ? { width: '100%' } : {}),
    ...(disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={style}
      aria-label={rest['aria-label']}
      data-testid={rest['data-testid']}
    >
      {children}
    </button>
  );
}
