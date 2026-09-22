import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { NavLink as RouterNavLink } from 'react-router';

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
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-sticky)',
        backdropFilter: 'saturate(180%) blur(8px)',
      }}
    >
      <RouterNavLink
        to="/"
        end
        style={({ isActive }) => ({
          ...brandLink,
          color: isActive ? 'var(--color-primary)' : 'var(--color-foreground)',
        })}
      >
        Storyteller
      </RouterNavLink>
      <ul style={{ display: 'flex', gap: 'var(--space-2)', listStyle: 'none', margin: 0, padding: 0, flexWrap: 'wrap' }}>
        <Item to="/scenarios">Scenarios</Item>
        <Item to="/play">Play</Item>
        <Item to="/settings">Settings</Item>
        <Item to="/wallet">Wallet</Item>
        <Item to="/referrals">Referrals</Item>
        <Item to="/story-seed-preview">Story seed</Item>
      </ul>
    </nav>
  );
}

function Item({ to, children }: { to: string; children: ReactNode }): ReactElement {
  return (
    <li>
      <RouterNavLink
        to={to}
        style={({ isActive }) => ({
          ...navLink,
          color: isActive ? 'var(--color-primary)' : 'var(--color-foreground-muted)',
          background: isActive ? 'var(--color-surface-muted)' : 'transparent',
        })}
      >
        {children}
      </RouterNavLink>
    </li>
  );
}

const brandLink: CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontWeight: 'var(--weight-semibold)',
  fontSize: 'var(--text-lg)',
  textDecoration: 'none',
  letterSpacing: '-0.01em',
};

const navLink: CSSProperties = {
  fontSize: 'var(--text-sm)',
  textDecoration: 'none',
  padding: 'var(--space-1) var(--space-3)',
  borderRadius: 'var(--radius-md)',
  fontWeight: 'var(--weight-medium)',
  minHeight: 'var(--control-touch-min)',
  display: 'inline-flex',
  alignItems: 'center',
};
