import type { ReactElement, ReactNode } from 'react';
import { Link } from 'react-router';

/**
 * Top navigation surfacing the five primary destinations a player uses
 * in stage S1 fixtures: scenarios, play, settings, wallet, referrals.
 * The admin link is intentionally absent — admin lives in
 * application/admin, never in the player SPA (see ADR-0001, layer
 * boundaries).
 */
export function TopNav(): ReactElement {
  return (
    <nav
      aria-label="Primary"
      style={{
        borderBottom: '1px solid var(--color-border)',
        padding: 'var(--space-3) var(--space-4)',
        display: 'flex',
        gap: 'var(--space-4)',
        alignItems: 'center',
        background: 'var(--color-surface)',
      }}
    >
      <Link
        to="/"
        style={{
          fontWeight: 600,
          fontSize: 'var(--text-lg)',
          color: 'var(--color-primary)',
        }}
      >
        Storyteller
      </Link>
      <NavLink to="/scenarios">Scenarios</NavLink>
      <NavLink to="/play">Play</NavLink>
      <NavLink to="/settings">Settings</NavLink>
      <NavLink to="/wallet">Wallet</NavLink>
      <NavLink to="/referrals">Referrals</NavLink>
    </nav>
  );
}

function NavLink({ to, children }: { to: string; children: ReactNode }): ReactElement {
  return (
    <Link
      to={to}
      style={{
        color: 'var(--color-foreground-muted)',
        fontSize: 'var(--text-sm)',
        textDecoration: 'none',
        padding: 'var(--space-1) var(--space-2)',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      {children}
    </Link>
  );
}
