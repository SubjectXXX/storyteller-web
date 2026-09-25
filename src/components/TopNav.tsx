import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { NavLink as RouterNavLink, useParams } from 'react-router';
import { Button } from '@/ui/Button';
import { Pill } from '@/ui/Pill';
import { useAuth } from '@/auth/useAuth';
import { useAdventures, useAdventureStream } from '@/hooks/useAdventures';
import { useNavigate } from 'react-router';

/**
 * Top navigation surfacing the primary destinations a player uses in the
 * S2 vertical slice: scenarios, adventures, settings, wallet, referrals,
 * plus authentication affordances (sign in / sign out) and a quick link
 * back to the player's active adventure.
 *
 * When the player is on `/adventures/:id` and the SSE stream is open, the
 * nav surfaces a "Streaming…" pill so they can see at a glance that the
 * LLM is mid-turn.
 */
export function TopNav(): ReactElement {
  const { token, user, signOut } = useAuth();
  const adventuresQuery = useAdventures();
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const activeAdventureId = (() => {
    const parsed = Number(params.id);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  })();
  const activeStream = useAdventureStream(activeAdventureId, { enabled: activeAdventureId !== undefined });
  const activeAdventure =
    adventuresQuery.data?.find((a) => a.status === 'active') ?? null;
  const isStreaming = activeStream.streaming;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

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
      <ul
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          listStyle: 'none',
          margin: 0,
          padding: 0,
          flexWrap: 'wrap',
        }}
      >
        <Item to="/scenarios">Scenarios</Item>
        <Item to="/settings">Settings</Item>
        <Item to="/wallet">Wallet</Item>
        <Item to="/referrals">Referrals</Item>
        <Item to="/story-seed-preview">Story seed</Item>
        {user?.is_admin === true && (
          <li>
            <a
              href="/admin/"
              style={{ ...navLink, color: 'var(--color-primary)' }}
              data-testid="admin-link"
              aria-label="Open the Storyteller administration console"
            >
              Admin
            </a>
          </li>
        )}
        {activeAdventure && (
          <Item
            to={`/adventures/${activeAdventure.id}`}
            data-testid="continue-adventure-link"
          >
            Continue adventure
          </Item>
        )}
        {isStreaming && (
          <li>
            <Pill
              intent="info"
              title="The adventure stream is open."
              data-testid="streaming-pill"
            >
              Streaming…
            </Pill>
          </li>
        )}
      </ul>
      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          gap: 'var(--space-2)',
          alignItems: 'center',
        }}
      >
        {token !== null && user ? (
          <>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-foreground-muted)' }}>
              Hi, {user.name}
            </span>
            <Button intent="ghost" size="sm" onClick={() => void handleSignOut()} aria-label="Sign out">
              Sign out
            </Button>
          </>
        ) : (
          <RouterNavLink to="/login" style={signinLink}>
            Sign in
          </RouterNavLink>
        )}
      </div>
    </nav>
  );
}

function Item({
  to,
  children,
  ...rest
}: {
  to: string;
  children: ReactNode;
  readonly 'data-testid'?: string;
}): ReactElement {
  return (
    <li>
      <RouterNavLink
        to={to}
        style={({ isActive }) => ({
          ...navLink,
          color: isActive ? 'var(--color-primary)' : 'var(--color-foreground-muted)',
          background: isActive ? 'var(--color-surface-muted)' : 'transparent',
        })}
        {...rest}
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

const signinLink: CSSProperties = {
  ...navLink,
  color: 'var(--color-primary)',
  textDecoration: 'none',
};
